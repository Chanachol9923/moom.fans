// Moom desktop: the app window runs the alert engine (sound, TTS, VTube Studio, hotkeys).
// OBS loads http://127.0.0.1:4848/, a page that only draws. This file serves that page
// and relays messages between it and the app window over a local WebSocket.

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    http::{header, HeaderMap, StatusCode, Uri},
    response::{IntoResponse, Redirect, Response},
    routing::get,
    Router,
};
use futures_util::{SinkExt, StreamExt};
use tauri::{AppHandle, Emitter, Manager};
use std::sync::{Arc, Mutex};
use tokio::sync::broadcast;

const PORT: u16 = 4848;
/// Messages from an OBS page are tiny (hello / tick); anything bigger is not ours.
const MAX_INBOUND: usize = 4096;

#[derive(Clone)]
struct Hub {
    tx: broadcast::Sender<String>,
    app: AppHandle,
    /// Why the local server isn't running, if it isn't. Kept because the failure
    /// usually happens before the window has loaded and could hear the event.
    error: Arc<Mutex<Option<String>>>,
}

impl Hub {
    fn fail(&self, e: String) {
        *self.error.lock().unwrap() = Some(e.clone());
        let _ = self.app.emit("overlay://server-error", e);
    }
}

/// App window -> every connected OBS page.
#[tauri::command]
fn overlay_send(hub: tauri::State<'_, Hub>, msg: String) {
    // No receivers just means OBS isn't open yet.
    let _ = hub.tx.send(msg);
}

#[tauri::command]
fn overlay_server_error(hub: tauri::State<'_, Hub>) -> Option<String> {
    hub.error.lock().unwrap().clone()
}

/// Shown on the web when the streamer approves this PC.
#[tauri::command]
fn device_name() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "PC".into())
}

/// Only our own OBS page may connect. Browsers always send Origin on WebSocket
/// upgrades, so a random website open in the streamer's browser can't listen in.
fn origin_ok(headers: &HeaderMap) -> bool {
    match headers.get(header::ORIGIN).and_then(|v| v.to_str().ok()) {
        None => true, // not a browser
        Some(o) => {
            o == format!("http://127.0.0.1:{PORT}")
                || o == format!("http://localhost:{PORT}")
                || (cfg!(debug_assertions) && o == "http://localhost:1420")
        }
    }
}

async fn ws_route(ws: WebSocketUpgrade, headers: HeaderMap, State(hub): State<Hub>) -> Response {
    if !origin_ok(&headers) {
        return StatusCode::FORBIDDEN.into_response();
    }
    ws.on_upgrade(move |socket| client(socket, hub))
}

async fn client(socket: WebSocket, hub: Hub) {
    let (mut sink, mut stream) = socket.split();
    let mut rx = hub.tx.subscribe();
    let outbound = tokio::spawn(async move {
        loop {
            match rx.recv().await {
                Ok(msg) => {
                    if sink.send(Message::Text(msg.into())).await.is_err() {
                        break;
                    }
                }
                // A slow page missed some views; the next one replaces them anyway.
                Err(broadcast::error::RecvError::Lagged(_)) => continue,
                Err(broadcast::error::RecvError::Closed) => break,
            }
        }
    });
    while let Some(Ok(msg)) = stream.next().await {
        if let Message::Text(t) = msg {
            if t.len() <= MAX_INBOUND {
                let _ = hub.app.emit("overlay://message", t.as_str().to_owned());
            }
        }
    }
    outbound.abort();
}

/// The built OBS page and its assets, straight from the files embedded in the app.
async fn static_route(uri: Uri, State(hub): State<Hub>) -> Response {
    let path = uri.path();
    if cfg!(debug_assertions) {
        // `tauri dev` doesn't embed the frontend; Vite serves it.
        let query = uri.query().map(|q| format!("?{q}")).unwrap_or_default();
        let target = if path == "/" { "/overlay.html" } else { path };
        return Redirect::temporary(&format!("http://localhost:1420{target}{query}")).into_response();
    }
    let file = match path {
        "/" | "/overlay.html" => "overlay.html",
        p if p.starts_with("/assets/") => &p[1..],
        _ => return StatusCode::NOT_FOUND.into_response(),
    };
    match hub.app.asset_resolver().get(file.to_owned()) {
        Some(asset) => (
            [
                (header::CONTENT_TYPE, asset.mime_type().to_owned()),
                (header::CACHE_CONTROL, "no-cache".to_owned()),
            ],
            asset.bytes().to_vec(),
        )
            .into_response(),
        None => StatusCode::NOT_FOUND.into_response(),
    }
}

async fn serve(hub: Hub) {
    let router = Router::new()
        .route("/ws", get(ws_route))
        .fallback(get(static_route))
        .with_state(hub.clone());
    match tokio::net::TcpListener::bind(("127.0.0.1", PORT)).await {
        Ok(listener) => {
            if let Err(e) = axum::serve(listener, router).await {
                hub.fail(e.to_string());
            }
        }
        // Usually another program on the port. The app shows it; alerts still play in-app.
        Err(e) => hub.fail(e.to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must be first: a second launch (e.g. from a moom:// link) focuses this one
        // and hands it the link instead of starting another engine.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![overlay_send, overlay_server_error, device_name])
        .setup(|app| {
            // Installed builds register moom:// in the installer; dev runs need it at runtime.
            #[cfg(all(debug_assertions, any(windows, target_os = "linux")))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                let _ = app.deep_link().register_all();
            }
            let (tx, _) = broadcast::channel(64);
            let hub = Hub { tx, app: app.handle().clone(), error: Arc::default() };
            app.manage(hub.clone());
            tauri::async_runtime::spawn(serve(hub));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Moom");
}
