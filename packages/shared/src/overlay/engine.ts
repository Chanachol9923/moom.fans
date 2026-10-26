"use client";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { isOverlayEvent, type OverlayAlert, type OverlayConfig, type OverlayPet, type OverlayState } from "../alerts";
import { tierFor } from "./design";
import { mergeQueue, vtsActionsFor } from "./queue";
import { OverlayAudio } from "./sound";
import { connectTwitchChat } from "./twitch";
import { VtsClient } from "../vts";

// The alert engine: keeps the queue in sync with the server, plays one alert at a time
// (sound, TTS, VTube Studio, wheel, media), and exposes what should be on screen as a
// plain serialisable StageView.
//
// On the website the engine and the stage run in the same OBS browser source.
// In the desktop app the engine runs in the app window (so audio, hotkeys and
// VTube Studio live on the PC) and the StageView is sent to the OBS page.

const POLL_MS = 10_000;
const BROADCAST_EVENT = "moom";

export type OverlayApi = {
  state: () => Promise<OverlayState | null>;
  claim: (id: string) => Promise<boolean>;
  finish: (id: string, skipped: boolean) => Promise<void>;
  ttsUrl: (id: string) => string | null;
};

/** The token-authorised overlay API. `origin` is "" on the website, the site URL in the app. */
export function httpApi(token: string, origin = ""): OverlayApi {
  const base = `${origin}/api/overlay/${token}`;
  return {
    state: async () => {
      const r = await fetch(`${base}/state`, { cache: "no-store" });
      return r.ok ? r.json() : null;
    },
    claim: async (id) => {
      const r = await fetch(`${base}/alerts/${id}/start`, { method: "POST" });
      return r.ok && (await r.json()).ok === true;
    },
    finish: async (id, skipped) => {
      await fetch(`${base}/alerts/${id}/${skipped ? "skipped" : "done"}`, { method: "POST" }).catch(() => {});
    },
    ttsUrl: (id) => `${base}/tts/${id}`,
  };
}

export type StagePhase = "alert" | "wheel" | "media";

/** Everything the OBS page needs to draw. JSON-safe so it can cross a WebSocket. */
export type StageView = {
  config: OverlayConfig;
  pets: OverlayPet[];
  current: {
    alert: OverlayAlert;
    phase: StagePhase;
    /** Date.now() when this phase began, for countdown bars. */
    startedAt: number;
    /** How long the alert card stays, for its countdown bar. */
    durationMs: number;
  } | null;
  paused: boolean;
};

export type EngineOptions = {
  api: OverlayApi;
  initial: OverlayState;
  /** Volume 0..100 that overrides the account setting (device-local). */
  volumeOverride?: number | null;
  /** Audio output device id (device-local). */
  sinkId?: string | null;
  /** Mute everything (dashboard preview). */
  silent?: boolean;
  /** Drive VTube Studio from this engine. */
  vts?: boolean;
  /** localStorage key for the VTube Studio plugin token. */
  vtsTokenKey?: string;
  /** Don't auto-play alerts that were already queued at start-up; let the user decide. */
  holdInitial?: boolean;
  /** Pet speech bubbles from Twitch chat. */
  onSpeak?: (user: string, text: string) => void;
};

export function useOverlayEngine(opts: EngineOptions) {
  const { initial } = opts;
  const [state, setState] = useState(initial);
  const [queue, setQueue] = useState<OverlayAlert[]>(opts.holdInitial ? [] : initial.alerts);
  const [held, setHeld] = useState<OverlayAlert[]>(opts.holdInitial ? initial.alerts : []);
  const [current, setCurrent] = useState<StageView["current"]>(null);
  const [paused, setPaused] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  // Without realtime (demo) there is nothing to connect to, so it is live from the start.
  const [connected, setConnected] = useState<"connecting" | "live" | "offline">(initial.realtime ? "connecting" : "live");

  const api = useRef(opts.api);
  const handled = useRef(new Set<string>(opts.holdInitial ? initial.alerts.map((a) => a.id) : []));
  const audio = useRef<OverlayAudio | null>(null);
  const abort = useRef<AbortController | null>(null);
  const vts = useRef<VtsClient | null>(null);
  const onSpeak = useRef(opts.onSpeak);
  useEffect(() => {
    onSpeak.current = opts.onSpeak;
  }, [opts.onSpeak]);

  const cfg = state.config;
  const volume = opts.silent ? 0 : (opts.volumeOverride ?? cfg.volume);

  // ---- audio ---------------------------------------------------------------
  useEffect(() => {
    audio.current = new OverlayAudio(volume);
    setSoundBlocked(audio.current.blocked);
    const unlock = () => audio.current?.resume().then(() => setSoundBlocked(false));
    window.addEventListener("pointerdown", unlock);
    return () => window.removeEventListener("pointerdown", unlock);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once
  }, []);
  useEffect(() => audio.current?.setVolume(volume), [volume]);
  useEffect(() => {
    if (opts.sinkId !== undefined) void audio.current?.setSink(opts.sinkId);
  }, [opts.sinkId]);

  // ---- server sync: poll + realtime nudges ------------------------------------
  const refresh = useCallback(async () => {
    const next = await api.current.state().catch(() => null);
    if (!next) return;
    setState(next);
    setQueue((q) => mergeQueue(q, next.alerts, handled.current));
  }, []);

  const stopCurrent = useCallback(() => {
    abort.current?.abort();
    audio.current?.stopAll();
  }, []);

  const panic = useCallback(() => {
    setPaused(true);
    stopCurrent();
  }, [stopCurrent]);
  const resume = useCallback(() => setPaused(false), []);

  useEffect(() => {
    const id = setInterval(refresh, POLL_MS);
    // Back online after a network drop: catch up now rather than at the next poll.
    window.addEventListener("online", refresh);
    let channel: RealtimeChannel | null = null;
    let sb: ReturnType<typeof createClient> | null = null;
    const rt = initial.realtime;
    if (rt) {
      // Realtime only, no login. A storage key of its own per instance keeps supabase-js
      // from warning about several clients sharing one (previews, StrictMode remounts).
      sb = createClient(rt.url, rt.key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: `moom-overlay-${Math.random().toString(36).slice(2)}`,
        },
      });
      channel = sb
        .channel(rt.channel, { config: { broadcast: { self: false } } })
        .on("broadcast", { event: BROADCAST_EVENT }, ({ payload }) => {
          if (!isOverlayEvent(payload)) return;
          if (payload.type === "alerts" || payload.type === "config") refresh();
          else if (payload.action === "panic") panic();
          else if (payload.action === "skip") stopCurrent();
          else if (payload.action === "resume") resume();
          else if (payload.action === "reload") location.reload();
        })
        .subscribe((status) => {
          setConnected(status === "SUBSCRIBED" ? "live" : status === "CLOSED" || status === "CHANNEL_ERROR" ? "offline" : "connecting");
        });
    }
    return () => {
      clearInterval(id);
      window.removeEventListener("online", refresh);
      channel?.unsubscribe();
      // Close the socket too, or every remount leaves one open.
      void sb?.realtime.disconnect();
    };
  }, [initial.realtime, refresh, stopCurrent, panic, resume]);

  // ---- VTube Studio -------------------------------------------------------------
  useEffect(() => {
    if (!opts.vts || opts.silent || !cfg.vtsEnabled || !cfg.vtsRules.length) return;
    const client = new VtsClient(opts.vtsTokenKey ?? "moom_vts_token_overlay");
    let dead = false;
    const tryConnect = () =>
      client.connect().catch(() => {
        if (!dead) setTimeout(tryConnect, 15_000);
      });
    tryConnect();
    vts.current = client;
    return () => {
      dead = true;
      client.close();
      vts.current = null;
    };
  }, [opts.vts, opts.silent, opts.vtsTokenKey, cfg.vtsEnabled, cfg.vtsRules.length]);

  // ---- Twitch chat -> pet bubbles -------------------------------------------------
  useEffect(() => {
    if (!cfg.petsEnabled || !cfg.twitchChannel || !state.pets.some((p) => p.chatter)) return;
    return connectTwitchChat(cfg.twitchChannel, (m) => onSpeak.current?.(m.user, m.text));
  }, [cfg.petsEnabled, cfg.twitchChannel, state.pets]);

  // ---- the player loop --------------------------------------------------------------
  // One alert at a time. `busy` covers the gap between picking an alert and `current`
  // being set, because claiming it is an async request.
  const busy = useRef(false);
  const [tick, setTick] = useState(0);

  const play = useCallback(
    async (alert: OverlayAlert) => {
      const release = () => {
        busy.current = false;
        abort.current = null;
        setCurrent(null);
        setTick((t) => t + 1);
      };
      if (!(await api.current.claim(alert.id).catch(() => false))) return release(); // another overlay took it

      const ctrl = new AbortController();
      abort.current = ctrl;
      const signal = ctrl.signal;
      const p = alert.payload;
      const started = performance.now();
      const minMs = cfg.displaySeconds * 1000;
      setCurrent({ alert, phase: "alert", startedAt: Date.now(), durationMs: minMs });

      try {
        const a = audio.current;
        if (a) {
          const sound = tierFor(cfg.tiers, p.amount)?.tier.soundUrl ?? cfg.alertSoundUrl;
          if (sound) await a.playUrl(sound, signal).catch(() => a.chirp());
          else await a.chirp();
        }
        for (const rule of opts.vts && cfg.vtsEnabled ? vtsActionsFor(cfg.vtsRules, p.amount) : []) {
          const c = vts.current;
          if (!c?.connected) break;
          (rule.kind === "hotkey" ? c.triggerHotkey(rule.ref) : c.throwItem(rule.ref)).catch(() => {});
        }
        const tts = opts.silent ? null : api.current.ttsUrl(alert.id);
        if (p.tts && cfg.ttsEnabled && a && tts && !signal.aborted) await a.playUrl(tts, signal).catch(() => {});
        const rest = minMs - (performance.now() - started);
        if (rest > 0) await sleep(rest, signal);

        if (p.wheel && p.wheel.items.length > 1 && !signal.aborted) {
          setCurrent({ alert, phase: "wheel", startedAt: Date.now(), durationMs: 7500 });
          await sleep(7500, signal); // spin + time to read the result
        }

        if (p.media && cfg.mediaEnabled && !signal.aborted) {
          const ms = p.media.seconds * 1000 + 1500; // + player start-up
          setCurrent({ alert, phase: "media", startedAt: Date.now(), durationMs: ms });
          await sleep(ms, signal);
        }
      } finally {
        await api.current.finish(alert.id, signal.aborted);
        release();
      }
    },
    [cfg, opts.vts, opts.silent],
  );

  useEffect(() => {
    if (busy.current || paused || queue.length === 0) return;
    busy.current = true;
    const next = queue[0];
    const handledIds = handled.current;
    handledIds.add(next.id);
    let fired = false;
    const t = setTimeout(() => {
      fired = true;
      setQueue((q) => q.filter((a) => a.id !== next.id));
      void play(next);
    }, 0);
    return () => {
      if (fired) return;
      clearTimeout(t);
      busy.current = false;
      handledIds.delete(next.id);
    };
  }, [paused, queue, tick, play]);

  /** Decide what to do with alerts that were waiting when the engine started. */
  const releaseHeld = useCallback(
    (playThem: boolean) => {
      const list = held;
      setHeld([]);
      if (playThem) setQueue((q) => [...list, ...q]);
      else for (const a of list) void api.current.finish(a.id, true);
    },
    [held],
  );

  /** Queue a local-only alert (demo / test without the server). */
  const enqueueLocal = useCallback((a: OverlayAlert) => setQueue((q) => [...q, a]), []);

  const view: StageView = { config: cfg, pets: state.pets, current, paused };

  return {
    view,
    state,
    queueLength: queue.length,
    held,
    releaseHeld,
    connected,
    soundBlocked,
    panic,
    resume,
    skip: stopCurrent,
    refresh,
    enqueueLocal,
    wheelTick: () => audio.current?.tick(),
  };
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      resolve();
    });
  });
}

/** Dashboard preview: reads the real queue but never claims, so OBS still gets every alert. */
export function previewApi(real: OverlayApi): OverlayApi {
  return { ...real, claim: async () => true, finish: async () => {}, ttsUrl: () => null };
}

/** Offline stand-in for demos: nothing to fetch, alerts come from enqueueLocal. */
export const demoApi: OverlayApi = {
  state: async () => null,
  claim: async () => true,
  finish: async () => {},
  ttsUrl: () => null,
};
