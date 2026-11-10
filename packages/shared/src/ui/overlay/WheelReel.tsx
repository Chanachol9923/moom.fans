"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { fmt, getDict, type Locale } from "@moom/shared/i18n";
import { REEL_LAPS, REEL_SPIN_MS, type WheelLook } from "@moom/shared/wheel";

// The prize wheel's looks. All of them run the same spin: `steps` labels pass the marker,
// easing out onto the result the server already picked, so the click sound (onTick, or
// reelTickTimes in the engine) matches every look.

type SpinProps = {
  items: string[];
  result: number;
  accent: string;
  locale: Locale;
  onTick?: () => void;
};

/** Runs the spin: calls onFrame with the position (0..steps) every frame, onTick per label passed. */
function useSpin(steps: number, onFrame: (pos: number) => void, onTick?: () => void) {
  const [done, setDone] = useState(false);
  const frame = useRef(onFrame);
  const tick = useRef(onTick);
  useEffect(() => {
    frame.current = onFrame;
    tick.current = onTick;
  });
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    let last = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / REEL_SPIN_MS);
      const pos = steps * (1 - Math.pow(1 - t, 4));
      frame.current(pos);
      const passed = Math.floor(pos);
      if (passed !== last) {
        last = passed;
        tick.current?.();
      }
      if (t < 1) raf = requestAnimationFrame(step);
      else setDone(true);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [steps]);
  return done;
}

/** Title on top, the result blinking underneath once it stops. */
function Frame({ locale, accent, label, done, children }: { locale: Locale; accent: string; label: string; done: boolean; children: ReactNode }) {
  const d = getDict(locale);
  return (
    <div className="px-frame px-frame-raised w-[min(80vw,520px)] bg-paper p-3 text-center">
      <div className="mb-2 font-title text-lg">{d.alert.wheel}</div>
      {children}
      <div className={`mt-2 h-8 truncate font-title text-xl ${done ? "px-blink" : "opacity-0"}`} style={{ color: accent }}>
        {fmt(d.alert.wheelResult, { result: label })}
      </div>
    </div>
  );
}

/** Picks the look. Missing or unknown looks get the round wheel. */
export function WheelSpin({ look = "wheel", ...p }: SpinProps & { look?: WheelLook }) {
  if (look === "reel") return <WheelReel {...p} />;
  if (look === "lights") return <WheelLights {...p} />;
  return <WheelDisc {...p} />;
}

const ROW = 64;

/** Slot machine: the labels scroll past a window. */
export function WheelReel({ items, result, accent, locale, onTick }: SpinProps) {
  const strip_ = useRef<HTMLDivElement>(null);
  const steps = REEL_LAPS * items.length + result;
  // Long strip: several laps, ending on the result in the middle window.
  const strip = Array.from({ length: steps + items.length }, (_, i) => items[i % items.length]);
  const done = useSpin(
    steps,
    (pos) => {
      // Snap to 4px steps so it moves like pixels, not butter. Written straight to the
      // DOM: re-rendering the strip at 60 fps is wasted work in OBS.
      if (strip_.current) strip_.current.style.transform = `translateY(${-(Math.round((pos * ROW) / 4) * 4) + ROW}px)`;
    },
    onTick,
  );

  return (
    <Frame locale={locale} accent={accent} label={items[result] ?? ""} done={done}>
      <div className="relative mx-auto overflow-hidden bg-ink" style={{ height: ROW * 3 }}>
        <div ref={strip_} style={{ transform: `translateY(${ROW}px)` }}>
          {strip.map((label, i) => (
            <div key={i} className="flex items-center justify-center px-3 font-title text-xl text-paper" style={{ height: ROW }}>
              <span className="truncate">{label}</span>
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 border-y-[3px]" style={{ top: ROW, height: ROW, borderColor: accent }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-ink to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-ink to-transparent" />
      </div>
    </Frame>
  );
}

const CREAM = "#fff1d6";
const GOLD = "#ffc94d";

/** Letters as people see them (Thai vowels and tone marks join the letter before). */
function graphemes(s: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s)].map((x) => x.segment);
  }
  return [...s];
}

function textOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "#2b2433" : "#ffffff";
}

/** Round wheel: coloured slices turn under a pointer at the top. */
export function WheelDisc({ items, result, accent, locale, onTick }: SpinProps) {
  const disc = useRef<SVGGElement>(null);
  const n = items.length;
  const slice = 360 / n;
  const steps = REEL_LAPS * n + result;
  const done = useSpin(
    steps,
    (pos) => {
      // Whole-degree turns keep the edges crisp, like a pixel sprite.
      if (disc.current) disc.current.setAttribute("transform", `rotate(${-Math.round(pos * slice + slice / 2)} 100 100)`);
    },
    onTick,
  );
  const colors = items.map((_, i) => (n % 2 === 1 && i === n - 1 ? GOLD : i % 2 ? CREAM : /^#[0-9a-f]{6}$/i.test(accent) ? accent : "#2f7a6a"));
  const point = (deg: number, r: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return `${100 + r * Math.cos(a)} ${100 + r * Math.sin(a)}`;
  };

  return (
    <Frame locale={locale} accent={accent} label={items[result] ?? ""} done={done}>
      <svg viewBox="0 0 200 200" className="mx-auto block w-[min(60vw,220px)]" shapeRendering="crispEdges" aria-hidden>
        <g ref={disc} transform={`rotate(${-slice / 2} 100 100)`}>
          {items.map((label, i) => {
            const from = i * slice;
            const to = (i + 1) * slice;
            const mid = from + slice / 2;
            // Long labels are squeezed to fit the slice instead of being cut short.
            const g = graphemes(label);
            const text = g.length > 16 ? `${g.slice(0, 15).join("")}…` : label;
            const squeeze = g.length > 9;
            // Where this slice ends up when the wheel stops; on the left half the label is
            // turned round so it reads the right way up.
            const rest = (((mid - (result * slice + slice / 2)) % 360) + 360) % 360;
            const flip = rest >= 180;
            return (
              <g key={i}>
                <path
                  d={n === 1 ? "M100 6a94 94 0 1 0 0.01 0Z" : `M100 100L${point(from, 94)}A94 94 0 ${slice > 180 ? 1 : 0} 1 ${point(to, 94)}Z`}
                  fill={colors[i]}
                  stroke="#2b2433"
                  strokeWidth={3}
                />
                <text
                  x={100}
                  y={100}
                  transform={`rotate(${mid - 90} 100 100) translate(50 0)${flip ? " rotate(180 100 100)" : ""}`}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={textOn(colors[i])}
                  className="font-title"
                  fontSize={n > 8 ? 10 : 12}
                  textLength={squeeze ? 68 : undefined}
                  lengthAdjust={squeeze ? "spacingAndGlyphs" : undefined}
                >
                  {text}
                </text>
              </g>
            );
          })}
          <circle cx={100} cy={100} r={12} fill="#2b2433" />
          <circle cx={100} cy={100} r={5} fill={CREAM} />
        </g>
        <circle cx={100} cy={100} r={95} fill="none" stroke="#2b2433" strokeWidth={6} />
        {/* Pointer */}
        <path d="M88 0h24l-12 18Z" fill={GOLD} stroke="#2b2433" strokeWidth={3} />
      </svg>
    </Frame>
  );
}

/** Light board: a highlight runs over the prize boxes and stops on the winner. */
export function WheelLights({ items, result, accent, locale, onTick }: SpinProps) {
  const n = items.length;
  const steps = REEL_LAPS * n + result;
  const [lit, setLit] = useState(0);
  const done = useSpin(steps, (pos) => setLit(Math.floor(pos) % n), onTick);
  const cols = n <= 3 ? n : n === 4 ? 2 : n <= 6 ? 3 : 4;

  return (
    <Frame locale={locale} accent={accent} label={items[result] ?? ""} done={done}>
      <div className="grid gap-2 bg-ink p-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {items.map((label, i) => {
          const on = i === lit;
          return (
            <div
              key={i}
              className={`grid min-h-14 place-items-center border-[3px] px-2 py-2 font-title text-base ${on && done ? "px-blink" : ""}`}
              style={
                on
                  ? { background: accent, borderColor: GOLD, color: textOn(/^#[0-9a-f]{6}$/i.test(accent) ? accent : "#2f7a6a") }
                  : { background: "#3a3145", borderColor: "#4d4259", color: CREAM }
              }
            >
              <span className="line-clamp-2 break-words">{label}</span>
            </div>
          );
        })}
      </div>
    </Frame>
  );
}
