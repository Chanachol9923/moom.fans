"use client";
import { useEffect, useRef } from "react";
import type { OverlayAlert, OverlayState } from "../../alerts";
import { getDict } from "../../i18n";
import { demoApi, httpApi, previewApi, useOverlayEngine } from "../../overlay/engine";
import { OverlayStage } from "./OverlayStage";

/**
 * Website overlay ("Lite" mode): engine and stage in the same OBS browser source.
 * The desktop app runs the same engine in its own window instead.
 */
export function OverlayApp({
  token,
  initial,
  demo = false,
  preview = false,
}: {
  token: string;
  initial: OverlayState;
  /** Fully offline; alerts come from window.moomDemo. */
  demo?: boolean;
  /** Dashboard preview: reads the real queue but never claims alerts, so OBS still gets them. */
  preview?: boolean;
}) {
  const speakRef = useRef<((user: string, text: string) => void) | null>(null);
  const engine = useOverlayEngine({
    api: demo ? demoApi : preview ? previewApi(httpApi(token)) : httpApi(token),
    initial,
    silent: preview,
    vts: !preview,
    onSpeak: (user, text) => speakRef.current?.(user, text),
  });
  const { enqueueLocal, panic, resume, skip } = engine;
  const d = getDict(engine.view.config.locale);

  useEffect(() => {
    if (!demo) return;
    (window as unknown as { moomDemo: (a: OverlayAlert) => void }).moomDemo = enqueueLocal;
  }, [demo, enqueueLocal]);

  // Dev convenience in a normal browser tab: P = panic, R = resume, S = skip.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "p") panic();
      else if (e.key === "r") resume();
      else if (e.key === "s") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panic, resume, skip]);

  return (
    <OverlayStage
      view={engine.view}
      speakRef={speakRef}
      onWheelTick={engine.wheelTick}
      notice={
        engine.soundBlocked && !preview ? (
          <div className="absolute top-3 right-3 bg-ink/80 px-2 py-1 font-display text-xs text-paper">
            {d.alert.clickForSound}
          </div>
        ) : null
      }
    />
  );
}
