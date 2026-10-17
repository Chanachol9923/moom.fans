"use client";
import { useEffect, useRef, useState } from "react";
import { fmt, getDict, type Locale } from "@moom/shared/i18n";

const ROW = 64;
const SPIN_MS = 4200;

/**
 * Slot-machine style reel: the labels scroll past and ease out onto the result
 * that the server already picked. Calls onTick for each label that passes the
 * marker (for a click sound) and onDone when it has stopped.
 */
export function WheelReel({
  items,
  result,
  accent,
  locale,
  onTick,
}: {
  items: string[];
  result: number;
  accent: string;
  locale: Locale;
  onTick?: () => void;
}) {
  const d = getDict(locale);
  const [offset, setOffset] = useState(0);
  const [done, setDone] = useState(false);
  const lastRow = useRef(-1);
  // Long strip: several laps, ending on the result in the middle window.
  const laps = 6;
  const strip = Array.from({ length: laps * items.length + items.length }, (_, i) => items[i % items.length]);
  const target = (laps * items.length + result) * ROW;

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / SPIN_MS);
      const eased = 1 - Math.pow(1 - t, 4);
      const y = target * eased;
      // Snap to 4px steps so it moves like pixels, not butter.
      setOffset(Math.round(y / 4) * 4);
      const row = Math.floor(y / ROW);
      if (row !== lastRow.current) {
        lastRow.current = row;
        onTick?.();
      }
      if (t < 1) raf = requestAnimationFrame(step);
      else setDone(true);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, onTick]);

  return (
    <div className="px-frame px-frame-raised w-[min(80vw,520px)] bg-paper p-3 text-center">
      <div className="mb-2 font-display text-lg">{d.alert.wheel}</div>
      <div className="relative mx-auto overflow-hidden bg-ink" style={{ height: ROW * 3 }}>
        <div style={{ transform: `translateY(${-offset + ROW}px)` }}>
          {strip.map((label, i) => (
            <div
              key={i}
              className="flex items-center justify-center px-3 font-display text-xl text-paper"
              style={{ height: ROW }}
            >
              <span className="truncate">{label}</span>
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 border-y-[3px]" style={{ top: ROW, height: ROW, borderColor: accent }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-ink to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-ink to-transparent" />
      </div>
      <div className={`mt-2 h-8 font-display text-xl ${done ? "px-blink" : "opacity-0"}`} style={{ color: accent }}>
        {fmt(d.alert.wheelResult, { result: items[result] ?? "" })}
      </div>
    </div>
  );
}
