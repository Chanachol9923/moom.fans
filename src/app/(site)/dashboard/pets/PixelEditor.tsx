"use client";
import { useState } from "react";
import { Button } from "@moom/shared/ui/kit";
import { useT } from "@moom/shared/i18n/react";
import { PRESET_SPECIES, PRESETS, SPRITE_SIZE, type PetSprite, type SpriteFrames } from "@moom/shared/pets/sprites";

// Palette slot keys a custom sprite may use (same letters as the presets).
const SLOTS = ["k", "b", "d", "a", "w", "e", "y", "p"] as const;
const DEFAULT_COLORS: Record<string, string> = {
  k: "#241e19", b: "#8a97ab", d: "#5f6b80", a: "#3f8f7a", w: "#dfe2e6", e: "#241e19", y: "#e0a13a", p: "#d9727f",
};
const CELL = 18;

function setPixel(rows: string[], x: number, y: number, ch: string): string[] {
  const next = [...rows];
  next[y] = next[y].slice(0, x) + ch + next[y].slice(x + 1);
  return next;
}

export function PixelEditor({ value, onChange }: { value: PetSprite; onChange: (s: PetSprite) => void }) {
  const { d } = useT();
  const [frame, setFrame] = useState<keyof SpriteFrames>("stand");
  const [brush, setBrush] = useState<string>("k");
  const palette = { ...DEFAULT_COLORS, ...value.palette };
  const rows = value.frames[frame];

  const paint = (x: number, y: number) => {
    const ch = brush;
    if (rows[y][x] === ch) return;
    const nextPalette = ch === "." || value.palette[ch] ? value.palette : { ...value.palette, [ch]: palette[ch] };
    onChange({ palette: nextPalette, frames: { ...value.frames, [frame]: setPixel(rows, x, y, ch) } });
  };

  const frames: Array<[keyof SpriteFrames, string]> = [
    ["stand", d.pets.frameStand],
    ["step", d.pets.frameStep],
    ["sleep", d.pets.frameSleep],
  ];

  return (
    <div className="mb-4">
      <div className="px-label">{d.pets.editor}</div>
      <div className="mb-2 flex flex-wrap items-center gap-1">
        {frames.map(([f, label]) => (
          <button
            key={f}
            type="button"
            onClick={() => setFrame(f)}
            className={`px-btn px-btn-sm ${frame === f ? "px-btn-primary" : ""}`}
          >
            {label}
          </button>
        ))}
        <span className="mx-1 text-ink-faint">|</span>
        {PRESET_SPECIES.map((s) => (
          <button
            key={s}
            type="button"
            className="px-btn px-btn-sm px-btn-ghost"
            title={d.pets.speciesNames[s]}
            onClick={() => onChange(structuredClone(PRESETS[s]))}
          >
            {d.pets.speciesNames[s]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div
          className="grid touch-none select-none bg-[repeating-conic-gradient(#e6dbc2_0_25%,#f2ead7_0_50%)] bg-[length:18px_18px]"
          style={{ gridTemplateColumns: `repeat(${SPRITE_SIZE}, ${CELL}px)` }}
        >
          {rows.map((row, y) =>
            [...row].map((ch, x) => (
              <div
                key={`${x}-${y}`}
                onPointerDown={(e) => {
                  // Release capture so dragging paints across cells.
                  (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
                  paint(x, y);
                }}
                onPointerEnter={(e) => e.buttons === 1 && paint(x, y)}
                className="border-[0.5px] border-ink/10"
                style={{ width: CELL, height: CELL, background: ch === "." ? undefined : palette[ch] }}
              />
            )),
          )}
        </div>

        <div className="grid gap-1">
          {SLOTS.map((slot) => (
            <div key={slot} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setBrush(slot)}
                aria-pressed={brush === slot}
                className={`size-7 ${brush === slot ? "outline-[3px] outline-offset-1 outline-ink outline-solid" : ""}`}
                style={{ background: palette[slot] }}
                aria-label={slot}
              />
              <input
                type="color"
                value={palette[slot]}
                onChange={(e) => onChange({ ...value, palette: { ...value.palette, [slot]: e.target.value } })}
                className="h-7 w-8 cursor-pointer"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setBrush(".")}
            aria-pressed={brush === "."}
            className={`px-btn px-btn-sm ${brush === "." ? "px-btn-primary" : ""}`}
          >
            {d.pets.eraser}
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {frame !== "stand" && (
          <Button
            type="button"
            size="sm"
            onClick={() => onChange({ ...value, frames: { ...value.frames, [frame]: [...value.frames.stand] } })}
          >
            {d.pets.copyFrame}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() =>
            onChange({ ...value, frames: { ...value.frames, [frame]: Array(SPRITE_SIZE).fill(".".repeat(SPRITE_SIZE)) } })
          }
        >
          {d.pets.clear}
        </Button>
      </div>
    </div>
  );
}
