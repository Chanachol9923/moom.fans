"use client";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertBox } from "@/components/AlertBox";
import { isOverlayEvent, type OverlayAlert, type OverlayState } from "@/lib/alerts/types";
import { getDict } from "@/lib/i18n";
import { mergeQueue, POSITION_CLASS, vtsActionsFor } from "@/lib/overlay/queue";
import { OverlayAudio } from "@/lib/overlay/sound";
import { connectTwitchChat } from "@/lib/overlay/twitch";
import { VtsClient } from "@/lib/vts/client";
import { PetsLayer } from "./PetsLayer";
import { WheelReel } from "./WheelReel";

const POLL_MS = 10_000;
const MEDIA_EVENT = "moom";

type Api = {
  state: () => Promise<OverlayState | null>;
  claim: (id: string) => Promise<boolean>;
  finish: (id: string, skipped: boolean) => Promise<void>;
  ttsUrl: (id: string) => string | null;
};

function httpApi(token: string): Api {
  const base = `/api/overlay/${token}`;
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

type Current = { alert: OverlayAlert; phase: "alert" | "wheel" | "media"; progress: number };

export function OverlayApp({
  token,
  initial,
  demo = false,
  preview = false,
}: {
  token: string;
  initial: OverlayState;
  /** Fully offline, alerts come from window.moomDemo / the demo driver. */
  demo?: boolean;
  /** Dashboard preview: reads the real queue but never claims alerts, so OBS still gets them. */
  preview?: boolean;
}) {
  const [state, setState] = useState(initial);
  const [queue, setQueue] = useState<OverlayAlert[]>(initial.alerts);
  const [current, setCurrent] = useState<Current | null>(null);
  const [paused, setPaused] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);

  const api = useRef<Api>(demo ? demoApi(setQueue) : preview ? previewApi(httpApi(token)) : httpApi(token));
  const handled = useRef(new Set<string>());
  const audio = useRef<OverlayAudio | null>(null);
  const abort = useRef<AbortController | null>(null);
  const vts = useRef<VtsClient | null>(null);
  const speakRef = useRef<((user: string, text: string) => void) | null>(null);
  const cfg = state.config;
  const d = getDict(cfg.locale);
  const showPets = cfg.petsEnabled && state.pets.length > 0;

  // ---- audio -------------------------------------------------------------
  useEffect(() => {
    audio.current = new OverlayAudio(preview ? 0 : cfg.volume);
    setSoundBlocked(audio.current.blocked);
    const unlock = () => audio.current?.resume().then(() => setSoundBlocked(false));
    window.addEventListener("pointerdown", unlock);
    return () => window.removeEventListener("pointerdown", unlock);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once
  }, []);
  useEffect(() => audio.current?.setVolume(preview ? 0 : cfg.volume), [cfg.volume, preview]);

  // ---- server sync: poll + realtime nudges -----------------------------------
  const refresh = useCallback(async () => {
    const next = await api.current.state();
    if (!next) return;
    setState(next);
    setQueue((q) => mergeQueue(q, next.alerts, handled.current));
  }, []);

  const stopCurrent = useCallback(() => {
    abort.current?.abort();
    audio.current?.stopAll();
  }, []);

  useEffect(() => {
    if (demo) return;
    const id = setInterval(refresh, POLL_MS);
    let channel: RealtimeChannel | null = null;
    const rt = initial.realtime;
    if (rt) {
      const sb = createClient(rt.url, rt.key, { auth: { persistSession: false } });
      channel = sb
        .channel(rt.channel, { config: { broadcast: { self: false } } })
        .on("broadcast", { event: MEDIA_EVENT }, ({ payload }) => {
          if (!isOverlayEvent(payload)) return;
          if (payload.type === "alerts" || payload.type === "config") refresh();
          else if (payload.action === "panic") {
            setPaused(true);
            stopCurrent();
          } else if (payload.action === "skip") stopCurrent();
          else if (payload.action === "resume") setPaused(false);
          else if (payload.action === "reload") location.reload();
        })
        .subscribe();
    }
    return () => {
      clearInterval(id);
      channel?.unsubscribe();
    };
  }, [demo, initial.realtime, refresh, stopCurrent]);

  // ---- VTube Studio ------------------------------------------------------------
  useEffect(() => {
    if (preview || !cfg.vtsEnabled || !cfg.vtsRules.length) return;
    const client = new VtsClient("moom_vts_token_overlay");
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
  }, [preview, cfg.vtsEnabled, cfg.vtsRules.length]);

  // ---- Twitch chat -> pet bubbles ------------------------------------------------
  useEffect(() => {
    if (!cfg.petsEnabled || !cfg.twitchChannel || !state.pets.some((p) => p.chatter)) return;
    return connectTwitchChat(cfg.twitchChannel, (m) => speakRef.current?.(m.user, m.text));
  }, [cfg.petsEnabled, cfg.twitchChannel, state.pets]);

  // ---- the player loop -----------------------------------------------------------
  // One alert at a time. `busy` guards the gap between picking an alert and
  // `current` being set (the claim request is async).
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
      if (!(await api.current.claim(alert.id))) return release(); // another overlay took it

      const ctrl = new AbortController();
      abort.current = ctrl;
      const signal = ctrl.signal;
      const p = alert.payload;
      const started = performance.now();
      const minMs = cfg.displaySeconds * 1000;

      setCurrent({ alert, phase: "alert", progress: 1 });
      const ticker = setInterval(() => {
        const left = 1 - (performance.now() - started) / minMs;
        setCurrent((c) => (c && c.alert.id === alert.id && c.phase === "alert" ? { ...c, progress: Math.max(0, left) } : c));
      }, 100);

      try {
        const a = audio.current;
        if (a) {
          if (cfg.alertSoundUrl) await a.playUrl(cfg.alertSoundUrl, signal).catch(() => a.chirp());
          else await a.chirp();
        }
        for (const rule of cfg.vtsEnabled ? vtsActionsFor(cfg.vtsRules, p.amount) : []) {
          const c = vts.current;
          if (!c?.connected) break;
          (rule.kind === "hotkey" ? c.triggerHotkey(rule.ref) : c.throwItem(rule.ref)).catch(() => {});
        }
        const tts = api.current.ttsUrl(alert.id);
        if (p.tts && cfg.ttsEnabled && a && tts && !signal.aborted) await a.playUrl(tts, signal).catch(() => {});
        const rest = minMs - (performance.now() - started);
        if (rest > 0) await sleep(rest, signal);

        if (p.wheel && p.wheel.items.length > 1 && !signal.aborted) {
          clearInterval(ticker);
          setCurrent({ alert, phase: "wheel", progress: 1 });
          await sleep(7500, signal); // spin + time to read the result
        }

        if (p.media && cfg.mediaEnabled && !signal.aborted) {
          clearInterval(ticker);
          setCurrent({ alert, phase: "media", progress: 1 });
          await sleep(p.media.seconds * 1000 + 1500, signal); // + player start-up
        }
      } finally {
        clearInterval(ticker);
        await api.current.finish(alert.id, signal.aborted);
        release();
      }
    },
    [cfg],
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

  const tickSound = useCallback(() => audio.current?.tick(), []);

  // Dev convenience in a normal browser tab: P = panic, R = resume, S = skip.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "p") {
        setPaused(true);
        stopCurrent();
      } else if (e.key === "r") setPaused(false);
      else if (e.key === "s") stopCurrent();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stopCurrent]);

  return (
    <div className="relative h-dvh w-dvw overflow-hidden text-[18px]">
      {showPets && <PetsLayer pets={state.pets} speakRef={speakRef} />}

      <div
        className={`absolute inset-0 flex p-8 ${POSITION_CLASS[cfg.position] ?? POSITION_CLASS["bottom-right"]}`}
        style={showPets && cfg.position.startsWith("bottom") ? { paddingBottom: 120 } : undefined}
      >
        {current?.phase === "alert" && (
          <div className="animate-[px-pop_180ms_steps(3)]" key={current.alert.id}>
            <AlertBox
              kind={current.alert.kind}
              payload={current.alert.payload}
              accent={cfg.accent}
              progress={current.progress}
              variant={cfg.alertStyle}
            />
          </div>
        )}
      </div>

      {current?.phase === "wheel" && current.alert.payload.wheel && (
        <div className="absolute inset-0 grid place-items-center p-10">
          <WheelReel
            key={current.alert.id}
            items={current.alert.payload.wheel.items}
            result={current.alert.payload.wheel.result}
            accent={cfg.accent}
            locale={cfg.locale}
            onTick={tickSound}
          />
        </div>
      )}

      {current?.phase === "media" && current.alert.payload.media && (
        <div className="absolute inset-0 grid place-items-center p-10">
          <div className="px-frame bg-ink p-1">
            <iframe
              key={current.alert.id}
              title="media share"
              width={960}
              height={540}
              className="block max-h-[70vh] max-w-[80vw]"
              allow="autoplay; encrypted-media"
              src={`https://www.youtube-nocookie.com/embed/${current.alert.payload.media.id}?autoplay=1&controls=0&disablekb=1&modestbranding=1&rel=0&start=${current.alert.payload.media.start}&end=${current.alert.payload.media.start + current.alert.payload.media.seconds}`}
            />
            <div className="px-2 py-1 font-display text-sm text-paper">
              {current.alert.payload.name} · {current.alert.payload.media.seconds}s
            </div>
          </div>
        </div>
      )}

      {paused && (
        <div className="absolute top-3 left-3 bg-tomato px-2 py-1 font-display text-sm text-paper">
          ■ {d.alert.paused}
        </div>
      )}
      {soundBlocked && !preview && (
        <div className="absolute top-3 right-3 bg-ink/80 px-2 py-1 font-display text-xs text-paper">
          {d.alert.clickForSound}
        </div>
      )}
    </div>
  );
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

function previewApi(real: Api): Api {
  return { ...real, claim: async () => true, finish: async () => {}, ttsUrl: () => null };
}

/** Offline stand-in used by /overlay/demo: alerts are generated locally. */
function demoApi(setQueue: React.Dispatch<React.SetStateAction<OverlayAlert[]>>): Api {
  if (typeof window !== "undefined") {
    (window as unknown as { moomDemo: (a: OverlayAlert) => void }).moomDemo = (a) => setQueue((q) => [...q, a]);
  }
  return {
    state: async () => null,
    claim: async () => true,
    finish: async () => {},
    ttsUrl: () => null,
  };
}
