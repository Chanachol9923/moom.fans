"use client";
import { useState, useTransition } from "react";
import { useT } from "@moom/shared/i18n/react";
import type { WheelPlace } from "@moom/shared/wheel";
import { setWheelPlace } from "../more-actions";

/** Where the prize wheel spins: on the alert overlay, or in its own OBS widget. Saves at once. */
export function WheelPlacePicker({ place }: { place: WheelPlace }) {
  const { d } = useT();
  const [value, setValue] = useState(place);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const options: Array<[WheelPlace, string, string]> = [
    ["overlay", d.fun.placeOverlay, d.fun.placeOverlayHint],
    ["widget", d.fun.placeWidget, d.fun.placeWidgetHint],
  ];
  return (
    <div className="mb-3">
      <div className="px-label">{d.fun.placeTitle}</div>
      <div className="grid gap-2" role="radiogroup" aria-label={d.fun.placeTitle}>
        {options.map(([v, label, hint]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            disabled={pending}
            onClick={() => {
              if (v === value) return;
              const before = value;
              setValue(v);
              setFailed(false);
              start(async () => {
                const ok = await setWheelPlace(v).catch(() => false);
                if (!ok) {
                  setValue(before);
                  setFailed(true);
                }
              });
            }}
            className={`px-frame grid gap-0.5 p-2.5 text-left ${value === v ? "bg-ink text-paper" : "bg-paper hover:bg-paper-2"}`}
          >
            <span className="font-display">{label}</span>
            <span className={`text-sm ${value === v ? "text-paper/80" : "text-ink-soft"}`}>{hint}</span>
          </button>
        ))}
      </div>
      {failed && <p className="mt-1 text-sm text-tomato">{d.common.error}</p>}
    </div>
  );
}
