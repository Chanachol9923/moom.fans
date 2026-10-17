"use client";
import type { ReactNode } from "react";
import { getDict } from "../../i18n";
import type { StageView } from "../../overlay/engine";
import { POSITION_CLASS } from "../../overlay/queue";
import { AlertBox } from "../AlertBox";
import { PetsLayer } from "./PetsLayer";
import { WheelReel } from "./WheelReel";

/**
 * What OBS shows: pets, the alert card, the prize wheel and media share.
 * Pure rendering from a StageView, so it works next to the engine (website) or
 * fed over a local WebSocket from the desktop app.
 */
export function OverlayStage({
  view,
  speakRef,
  onWheelTick,
  notice,
}: {
  view: StageView;
  speakRef: React.RefObject<((user: string, text: string) => void) | null>;
  onWheelTick?: () => void;
  notice?: ReactNode;
}) {
  const { config: cfg, pets, current, paused } = view;
  const d = getDict(cfg.locale);
  const showPets = cfg.petsEnabled && pets.length > 0;

  return (
    <div className="relative h-dvh w-dvw overflow-hidden text-[18px]">
      {showPets && <PetsLayer pets={pets} speakRef={speakRef} />}

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
              durationMs={current.durationMs}
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
            onTick={onWheelTick}
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
        <div className="absolute top-3 left-3 bg-tomato px-2 py-1 font-display text-sm text-paper">■ {d.alert.paused}</div>
      )}
      {notice}
    </div>
  );
}
