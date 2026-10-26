"use client";
import type { ReactNode } from "react";
import type { AlertLook } from "@moom/shared/alerts";
import { useT } from "@moom/shared/i18n/react";
import { LOOK_PRESETS } from "@moom/shared/overlay/design";
import { Button, Check, cx } from "@moom/shared/ui/kit";

/** No-code controls for one tier's look. Every change shows in the preview next to it. */
export function LookEditor({ look, onChange }: { look: AlertLook; onChange: (l: AlertLook) => void }) {
  const { d } = useT();
  const L = d.design.look;
  const set = (patch: Partial<AlertLook>) => onChange({ ...look, ...patch });
  const color = (k: keyof AlertLook["colors"], v: string | number) => onChange({ ...look, colors: { ...look.colors, [k]: v } });

  return (
    <div className="grid gap-3">
      <div>
        <div className="px-label">{L.presets}</div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(LOOK_PRESETS) as Array<keyof typeof LOOK_PRESETS>).map((k) => (
            <Button key={k} size="sm" variant="ghost" onClick={() => onChange(LOOK_PRESETS[k])}>
              {L.presetNames[k]}
            </Button>
          ))}
        </div>
      </div>

      <Choice label={L.layout} value={look.layout} options={L.layouts} onChange={(layout) => set({ layout })} />
      <Choice label={L.align} value={look.align} options={L.aligns} onChange={(align) => set({ align })} />
      <Choice label={L.font} value={look.font} options={L.fonts} onChange={(font) => set({ font })} />
      <Choice label={L.frame} value={look.frame} options={L.frames} onChange={(frame) => set({ frame })} />
      <Choice label={L.shadow} value={look.shadow} options={L.shadows} onChange={(shadow) => set({ shadow })} />

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Slider label={L.scale} value={look.scale} min={0.6} max={2.5} step={0.05} show={`${Math.round(look.scale * 100)}%`} onChange={(scale) => set({ scale })} />
        <Slider label={L.width} value={look.width} min={240} max={1600} step={10} show={`${look.width}px`} onChange={(width) => set({ width })} />
        {look.layout !== "text" && (
          <Slider
            label={L.imageSize}
            value={look.imageSize}
            min={24}
            max={600}
            step={4}
            show={`${look.imageSize}px`}
            onChange={(imageSize) => set({ imageSize })}
          />
        )}
        {look.frame === "rounded" && (
          <Slider label={L.radius} value={look.radius} min={0} max={60} step={1} show={`${look.radius}px`} onChange={(radius) => set({ radius })} />
        )}
        <Slider
          label={L.bgAlpha}
          value={look.colors.bgAlpha}
          min={0}
          max={100}
          step={5}
          show={`${look.colors.bgAlpha}%`}
          onChange={(v) => color("bgAlpha", v)}
        />
      </div>

      <div>
        <div className="px-label">{L.colors}</div>
        <div className="flex flex-wrap gap-3">
          {(["bg", "border", "text", "name", "amount", "message"] as const).map((k) => (
            <label key={k} className="flex items-center gap-1.5 text-sm">
              <input
                type="color"
                value={look.colors[k]}
                onChange={(e) => color(k, e.target.value)}
                className="h-8 w-10 cursor-pointer border-[3px] border-ink bg-paper"
              />
              {L.colorNames[k]}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5">
        <Check label={L.outline} checked={look.outline} onChange={(e) => set({ outline: e.target.checked })} />
        <Check label={L.showBar} checked={look.showBar} onChange={(e) => set({ showBar: e.target.checked })} />
      </div>
    </div>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: ReactNode;
  value: T;
  options: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className="px-label">{label}</div>
      <div className="flex flex-wrap gap-1" role="radiogroup">
        {(Object.keys(options) as T[]).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={value === k}
            onClick={() => onChange(k)}
            className={cx("px-btn px-btn-sm", value === k ? "px-btn-primary" : "px-btn-ghost")}
          >
            {options[k]}
          </button>
        ))}
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  show,
  onChange,
}: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  show: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="mb-2 block">
      <span className="px-label flex justify-between">
        <span>{label}</span>
        <span className="font-num">{show}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
    </label>
  );
}
