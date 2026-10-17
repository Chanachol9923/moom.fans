// Everything that differs between the installed app (Tauri) and a plain browser tab.
// In a browser tab the app still runs end to end for testing: the OBS page talks to it
// over a BroadcastChannel instead of the local server, and there are no hotkeys or deep links.

import type { FromStage, ToStage } from "./stage-link";

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** Where the OBS page lives. The local server only exists in the installed app. */
export const LOCAL_ORIGIN = "http://127.0.0.1:4848";
export function obsUrl(extra?: string) {
  if (isTauri) return `${LOCAL_ORIGIN}/${extra ? `?${extra}` : ""}`;
  // Browser test mode: same-origin page, BroadcastChannel only.
  return `${location.origin}/overlay.html?bc=1${extra ? `&${extra}` : ""}`;
}

export async function openExternal(url: string) {
  if (!isTauri) {
    window.open(url, "_blank", "noopener");
    return;
  }
  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(url);
}

export async function deviceName(): Promise<string> {
  if (!isTauri) return "Browser";
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("device_name").catch(() => "PC");
}

/** moom://auth?code=…&state=… links, including the one that launched the app. */
export function onDeepLink(handler: (url: string) => void): () => void {
  if (!isTauri) return () => {};
  let off: (() => void) | undefined;
  let dead = false;
  void (async () => {
    const dl = await import("@tauri-apps/plugin-deep-link");
    const first = await dl.getCurrent().catch(() => null);
    for (const u of first ?? []) handler(u);
    const un = await dl.onOpenUrl((urls) => urls.forEach(handler));
    if (dead) un();
    else off = un;
  })();
  return () => {
    dead = true;
    off?.();
  };
}

/** Registers a system-wide hotkey. Returns an unregister function, or null if it isn't available. */
export async function registerHotkey(accelerator: string, onPress: () => void): Promise<(() => void) | null> {
  if (!isTauri || !accelerator) return null;
  const gs = await import("@tauri-apps/plugin-global-shortcut");
  try {
    await gs.unregister(accelerator).catch(() => {});
    await gs.register(accelerator, (e) => {
      if (e.state === "Pressed") onPress();
    });
  } catch {
    return null;
  }
  return () => void gs.unregister(accelerator).catch(() => {});
}

/** The local OBS server couldn't start (port taken). */
export function onServerError(handler: (message: string) => void): () => void {
  if (!isTauri) return () => {};
  let off: (() => void) | undefined;
  let dead = false;
  void (async () => {
    const [{ listen }, { invoke }] = await Promise.all([import("@tauri-apps/api/event"), import("@tauri-apps/api/core")]);
    const un = await listen<string>("overlay://server-error", (e) => handler(e.payload));
    if (dead) return un();
    off = un;
    const already = await invoke<string | null>("overlay_server_error").catch(() => null);
    if (already && !dead) handler(already);
  })();
  return () => {
    dead = true;
    off?.();
  };
}

// ---- app window <-> OBS page -------------------------------------------------------

const CHANNEL = "moom-stage";

/** App side: send to every OBS page and listen to what they say back. */
export function appLink(onMessage: (m: FromStage) => void): { send: (m: ToStage) => void; close: () => void } {
  if (!isTauri) {
    const bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = (e) => onMessage(e.data as FromStage);
    return { send: (m) => bc.postMessage(m), close: () => bc.close() };
  }
  let off: (() => void) | undefined;
  let dead = false;
  void (async () => {
    const { listen } = await import("@tauri-apps/api/event");
    const un = await listen<string>("overlay://message", (e) => {
      try {
        onMessage(JSON.parse(e.payload) as FromStage);
      } catch {
        /* ignore garbage from the socket */
      }
    });
    if (dead) un();
    else off = un;
  })();
  const invokeP = import("@tauri-apps/api/core").then((m) => m.invoke);
  return {
    send: (m) => void invokeP.then((invoke) => invoke("overlay_send", { msg: JSON.stringify(m) })).catch(() => {}),
    close: () => {
      dead = true;
      off?.();
    },
  };
}

/** OBS page side: the local WebSocket (installed app) or the BroadcastChannel (browser test mode). */
export function stageLink(
  onMessage: (m: ToStage) => void,
  mode: "ws" | "bc",
): { send: (m: FromStage) => void; close: () => void } {
  if (mode === "bc") {
    const bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = (e) => onMessage(e.data as ToStage);
    return { send: (m) => bc.postMessage(m), close: () => bc.close() };
  }

  let ws: WebSocket | null = null;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let delay = 500;
  let dead = false;
  const pending: FromStage[] = [];

  const connect = () => {
    if (dead) return;
    const sock = new WebSocket(`${LOCAL_ORIGIN.replace("http", "ws")}/ws`);
    ws = sock;
    sock.onopen = () => {
      delay = 500;
      for (const m of pending.splice(0)) sock.send(JSON.stringify(m));
    };
    sock.onmessage = (e) => {
      try {
        onMessage(JSON.parse(String(e.data)) as ToStage);
      } catch {
        /* ignore */
      }
    };
    sock.onclose = () => {
      ws = null;
      if (dead) return;
      retry = setTimeout(connect, delay);
      delay = Math.min(delay * 2, 5000);
    };
  };
  connect();

  return {
    send: (m) => {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m));
      else if (m.t === "hello") pending.splice(0, pending.length, m);
    },
    close: () => {
      dead = true;
      clearTimeout(retry);
      ws?.close();
    },
  };
}
