"use client";
import { useEffect, useRef } from "react";
import type { OverlayPet } from "@moom/shared/alerts";
import { drawFrame, SPRITE_SIZE, type SpriteFrames } from "@moom/shared/pets/sprites";

const SCALE = 4;

// Canvas can't resolve CSS variables, so read the next/font family names once.
const fonts = { pixel: "monospace", body: "sans-serif" };
function loadFonts() {
  const cs = getComputedStyle(document.documentElement);
  fonts.pixel = `${cs.getPropertyValue("--font-pixel").trim() || "monospace"}, ${cs.getPropertyValue("--font-thai-display").trim() || "sans-serif"}`;
  fonts.body = cs.getPropertyValue("--font-thai-body").trim() || "sans-serif";
}
const PX = SPRITE_SIZE * SCALE;
const BUBBLE_MS = 7000;
// Pixel pets don't need 60 fps; halving it halves the CPU OBS spends on this layer.
const FRAME_MS = 1000 / 30;

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

/** Pre-rendered sprite frames, name labels and bubbles, drawn with one drawImage each. */
type Cache = { frames: Map<string, HTMLCanvasElement>; label: HTMLCanvasElement | null };

function spriteBitmap(cache: Cache, wk: Walker, frame: keyof SpriteFrames, flip: boolean) {
  const key = `${frame}:${flip ? 1 : 0}`;
  let bmp = cache.frames.get(key);
  if (!bmp) {
    bmp = makeCanvas(PX, PX);
    drawFrame(bmp.getContext("2d")!, wk.pet.sprite, frame, 0, 0, SCALE, flip);
    cache.frames.set(key, bmp);
  }
  return bmp;
}

type Walker = {
  pet: OverlayPet;
  x: number;
  dir: 1 | -1;
  mode: "walk" | "idle" | "sleep";
  until: number;
  bubble: { text: string; until: number; bmp: HTMLCanvasElement | null } | null;
  cache: Cache;
};

/**
 * Pixel pets wandering along the bottom edge. One canvas, one rAF loop.
 * `say(chatter, text)` is exposed through `speakRef` for chat messages.
 */
export function PetsLayer({
  pets,
  speakRef,
}: {
  pets: OverlayPet[];
  speakRef: React.RefObject<((user: string, text: string) => void) | null>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const walkers = useRef<Walker[]>([]);

  // Keep positions when the pet list refreshes; add/remove as needed.
  useEffect(() => {
    const w = window.innerWidth;
    const prev = new Map(walkers.current.map((x) => [x.pet.id, x]));
    walkers.current = pets.map((pet, i) => {
      const old = prev.get(pet.id);
      // A changed sprite or name invalidates the cached bitmaps.
      if (old) return old.pet === pet ? old : { ...old, pet, cache: { frames: new Map(), label: null } };
      return {
        pet,
        x: ((i + 1) / (pets.length + 1)) * w,
        dir: Math.random() < 0.5 ? 1 : -1,
        mode: "walk",
        until: performance.now() + 2000 + Math.random() * 4000,
        bubble: null,
        cache: { frames: new Map(), label: null },
      };
    });
  }, [pets]);

  useEffect(() => {
    const say = (user: string, text: string) => {
      for (const wk of walkers.current) {
        if (wk.pet.chatter && wk.pet.chatter === user) {
          wk.bubble = { text: [...text].slice(0, 80).join(""), until: performance.now() + BUBBLE_MS, bmp: null };
          if (wk.mode === "sleep") wk.mode = "idle";
        }
      }
    };
    speakRef.current = say;
    return () => {
      speakRef.current = null;
    };
  }, [speakRef]);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    loadFonts();
    let raf = 0;
    let last = performance.now();
    let lastDraw = 0;

    const resize = () => {
      c.width = window.innerWidth;
      c.height = 180;
    };
    resize();
    window.addEventListener("resize", resize);

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - lastDraw < FRAME_MS) return;
      lastDraw = now;
      const dt = Math.min(100, now - last);
      last = now;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, c.width, c.height);
      const ground = c.height - PX - 4;

      for (const wk of walkers.current) {
        if (now > wk.until) {
          const r = Math.random();
          wk.mode = r < 0.55 ? "walk" : r < 0.85 ? "idle" : "sleep";
          if (wk.mode === "walk" && Math.random() < 0.4) wk.dir = wk.dir === 1 ? -1 : 1;
          wk.until = now + (wk.mode === "sleep" ? 6000 : 2000) + Math.random() * 5000;
        }
        if (wk.mode === "walk") {
          wk.x += wk.dir * dt * 0.045;
          if (wk.x < 0) {
            wk.x = 0;
            wk.dir = 1;
          } else if (wk.x > c.width - PX) {
            wk.x = c.width - PX;
            wk.dir = -1;
          }
        }
        const frame =
          wk.mode === "sleep" ? "sleep" : wk.mode === "walk" && Math.floor(now / 220) % 2 ? "step" : "stand";
        const x = Math.round(wk.x);
        ctx.drawImage(spriteBitmap(wk.cache, wk, frame, wk.dir === -1), x, ground);

        wk.cache.label ??= labelBitmap(wk.pet.name);
        ctx.drawImage(wk.cache.label, Math.round(x + PX / 2 - wk.cache.label.width / 2), ground + PX + 2 - wk.cache.label.height);
        if (wk.mode === "sleep") drawZ(ctx, x + PX - 6, ground + 6, now);
        if (wk.bubble && now < wk.bubble.until) {
          wk.bubble.bmp ??= bubbleBitmap(wk.bubble.text);
          const b = wk.bubble.bmp;
          const bx = Math.max(1, Math.min(c.width - b.width - 1, Math.round(x + PX / 2 - b.width / 2)));
          ctx.drawImage(b, bx, ground - 8 - b.height + 9);
        } else wk.bubble = null;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvas} className="pixelated pointer-events-none absolute inset-x-0 bottom-0" height={180} />;
}

function labelBitmap(text: string) {
  const probe = makeCanvas(1, 1).getContext("2d")!;
  probe.font = `600 13px ${fonts.pixel}`;
  const w = probe.measureText(text).width + 8;
  const c = makeCanvas(w, 20);
  const ctx = c.getContext("2d")!;
  ctx.font = `600 13px ${fonts.pixel}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#241e19";
  ctx.strokeText(text, c.width / 2, c.height - 2);
  ctx.fillStyle = "#f2ead7";
  ctx.fillText(text, c.width / 2, c.height - 2);
  return c;
}

function drawZ(ctx: CanvasRenderingContext2D, x: number, y: number, now: number) {
  const k = Math.floor(now / 500) % 3;
  ctx.font = "700 14px monospace";
  ctx.fillStyle = "#f2ead7";
  ctx.strokeStyle = "#241e19";
  ctx.lineWidth = 3;
  for (let i = 0; i <= k; i++) {
    ctx.strokeText("z", x + i * 7, y - i * 9);
    ctx.fillText("z", x + i * 7, y - i * 9);
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const ch of [...text]) {
    if (ctx.measureText(cur + ch).width > max && cur) {
      lines.push(cur);
      cur = ch;
    } else cur += ch;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

/** Speech bubble with a 3px pixel frame and a tail, rendered once per message. */
function bubbleBitmap(text: string) {
  const probe = makeCanvas(1, 1).getContext("2d")!;
  probe.font = `500 15px ${fonts.body}`;
  const lines = wrap(probe, text, 200);
  const w = Math.min(220, Math.max(...lines.map((l) => probe.measureText(l).width)) + 16);
  const h = lines.length * 19 + 10;
  const c = makeCanvas(w + 6, h + 15);
  const ctx = c.getContext("2d")!;
  const x = 3;
  const y = 3;
  ctx.fillStyle = "#241e19";
  ctx.fillRect(x, y - 3, w, h + 6);
  ctx.fillRect(x - 3, y, w + 6, h);
  ctx.fillStyle = "#fffaf0";
  ctx.fillRect(x, y, w, h);
  const cx = Math.round(c.width / 2);
  ctx.fillStyle = "#241e19";
  ctx.fillRect(cx - 3, y + h + 3, 6, 3);
  ctx.fillRect(cx - 1, y + h + 6, 3, 3);
  ctx.font = `500 15px ${fonts.body}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  lines.forEach((l, i) => ctx.fillText(l, x + 8, y + 5 + i * 19));
  return c;
}
