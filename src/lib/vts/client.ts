// Minimal VTube Studio public API client (browser WebSocket to ws://localhost:8001).
// Docs: https://github.com/DenchiSoft/VTubeStudio
// NOTE: written from the public API docs; test against a real VTube Studio before relying on it.

const PLUGIN = { pluginName: "Moom", pluginDeveloper: "moom.fans" };

type Pending = { resolve: (v: VtsMessage) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };
type VtsMessage = { messageType: string; requestID?: string; data?: Record<string, unknown> };

export type VtsHotkey = { hotkeyID: string; name: string; type: string };
export type VtsItemFile = { fileName: string; type?: string };

export class VtsClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, Pending>();
  private seq = 0;
  constructor(
    private readonly tokenKey: string,
    private readonly url = "ws://localhost:8001",
  ) {}

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.url);
      const t = setTimeout(() => {
        ws.close();
        reject(new Error("timeout"));
      }, 4000);
      ws.onopen = () => {
        clearTimeout(t);
        resolve();
      };
      ws.onerror = () => {
        clearTimeout(t);
        reject(new Error("connect failed"));
      };
      ws.onclose = () => {
        for (const p of this.pending.values()) p.reject(new Error("closed"));
        this.pending.clear();
      };
      ws.onmessage = (ev) => {
        let msg: VtsMessage;
        try {
          msg = JSON.parse(String(ev.data));
        } catch {
          return;
        }
        const p = msg.requestID ? this.pending.get(msg.requestID) : undefined;
        if (!p) return;
        clearTimeout(p.timer);
        this.pending.delete(msg.requestID!);
        if (msg.messageType === "APIError") p.reject(new Error(String(msg.data?.message ?? "APIError")));
        else p.resolve(msg);
      };
      this.ws = ws;
    });
    await this.authenticate();
  }

  close() {
    this.ws?.close();
    this.ws = null;
  }

  private request(messageType: string, data: Record<string, unknown> = {}, timeoutMs = 5000): Promise<VtsMessage> {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return Promise.reject(new Error("not connected"));
    const requestID = `moom-${++this.seq}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestID);
        reject(new Error(`${messageType} timed out`));
      }, timeoutMs);
      this.pending.set(requestID, { resolve, reject, timer });
      ws.send(JSON.stringify({ apiName: "VTubeStudioPublicAPI", apiVersion: "1.0", requestID, messageType, data }));
    });
  }

  private async authenticate() {
    let token = safeGet(this.tokenKey);
    if (token && (await this.tryToken(token))) return;
    // Pops a permission dialog inside VTube Studio; give the streamer time to click Allow.
    const res = await this.request("AuthenticationTokenRequest", PLUGIN, 60_000);
    token = String(res.data?.authenticationToken ?? "");
    if (!token) throw new Error("not allowed");
    safeSet(this.tokenKey, token);
    if (!(await this.tryToken(token))) throw new Error("auth failed");
  }

  private async tryToken(token: string) {
    try {
      const res = await this.request("AuthenticationRequest", { ...PLUGIN, authenticationToken: token });
      return Boolean(res.data?.authenticated);
    } catch {
      return false;
    }
  }

  async hotkeys(): Promise<VtsHotkey[]> {
    const res = await this.request("HotkeysInCurrentModelRequest");
    return (res.data?.availableHotkeys as VtsHotkey[] | undefined) ?? [];
  }

  async itemFiles(): Promise<VtsItemFile[]> {
    const res = await this.request("ItemListRequest", {
      includeAvailableSpots: false,
      includeItemInstancesInScene: false,
      includeAvailableItemFiles: true,
    });
    return (res.data?.availableItemFiles as VtsItemFile[] | undefined) ?? [];
  }

  triggerHotkey(hotkeyID: string) {
    return this.request("HotkeyTriggerRequest", { hotkeyID });
  }

  /** Drop an item from the top of the screen onto the model, then remove it. */
  async throwItem(fileName: string) {
    const x = Math.random() * 1.2 - 0.6;
    const load = await this.request("ItemLoadRequest", {
      fileName,
      positionX: x,
      positionY: 1.1,
      size: 0.28,
      rotation: Math.round(Math.random() * 360),
      fadeTime: 0.1,
      order: 0,
      failIfOrderTaken: false,
      smoothing: 0,
      censored: false,
      flipped: Math.random() < 0.5,
      locked: false,
      unloadWhenPluginDisconnects: true,
    });
    const id = String(load.data?.instanceID ?? "");
    if (!id) return;
    await this.request("ItemMoveRequest", {
      itemsToMove: [
        {
          itemInstanceID: id,
          timeInSeconds: 0.6,
          fadeMode: "easeIn",
          positionX: x * 0.5,
          positionY: 0.1,
          size: 0.28,
          rotation: Math.round(Math.random() * 360),
          order: 0,
          setFlip: false,
          flip: false,
          userCanStop: false,
        },
      ],
    }).catch(() => {});
    setTimeout(() => {
      this.request("ItemUnloadRequest", { instanceIDs: [id], unloadAllInScene: false, unloadAllLoadedByThisPlugin: false }).catch(() => {});
    }, 4000);
  }
}

function safeGet(k: string) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function safeSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode */
  }
}
