"use client";
import { useEffect, useRef } from "react";
import type { OverlayPet } from "@moom/shared/alerts";
import { drawFrame, SPRITE_SIZE } from "@moom/shared/pets/sprites";

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

type Walker = {
  pet: OverlayPet;
  x: number;
  dir: 1 | -1;
  mode: "walk" | "idle" | "sleep";
  until: number;
  bubble: { text: string; until: number } | null;
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
      if (old) return { ...old, pet };
      return {
        pet,
        x: ((i + 1) / (pets.length + 1)) * w,
        dir: Math.random() < 0.5 ? 1 : -1,
        mode: "walk",
        until: performance.now() + 2000 + Math.random() * 4000,
        bubble: null,
      };
    });
  }, [pets]);

  useEffect(() => {
    const say = (user: string, text: string) => {
      for (const wk of walkers.current) {
        if (wk.pet.chatter && wk.pet.chatter === user) {
          wk.bubble = { text: [...text].slice(0, 80).join(""), until: performance.now() + BUBBLE_MS };
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

    const resize = () => {
      c.width = window.innerWidth;
      c.height = 180;
    };
    resize();
    window.addEventListener("resize", resize);

    const tick = (now: number) => {
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
        drawFrame(ctx, wk.pet.sprite, frame, x, ground, SCALE, wk.dir === -1);

        drawLabel(ctx, wk.pet.name, x + PX / 2, ground + PX + 2);
        if (wk.mode === "sleep") drawZ(ctx, x + PX - 6, ground + 6, now);
        if (wk.bubble && now < wk.bubble.until) drawBubble(ctx, wk.bubble.text, x + PX / 2, ground - 8, c.width);
        else wk.bubble = null;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvas} className="pixelated pointer-events-none absolute inset-x-0 bottom-0" height={180} />;
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number) {
  ctx.font = `600 13px ${fonts.pixel}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#241e19";
  ctx.strokeText(text, cx, y);
  ctx.fillStyle = "#f2ead7";
  ctx.fillText(text, cx, y);
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

function drawBubble(ctx: CanvasRenderingContext2D, text: string, cx: number, bottom: number, width: number) {
  ctx.font = `500 15px ${fonts.body}`;
  const lines = wrap(ctx, text, 200);
  const w = Math.min(220, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16);
  const h = lines.length * 19 + 10;
  const x = Math.max(4, Math.min(width - w - 4, cx - w / 2));
  const y = bottom - h;
  // pixel frame: fill + 3px ink edges without corners
  ctx.fillStyle = "#241e19";
  ctx.fillRect(x, y - 3, w, h + 6);
  ctx.fillRect(x - 3, y, w + 6, h);
  ctx.fillStyle = "#fffaf0";
  ctx.fillRect(x, y, w, h);
  // tail
  ctx.fillStyle = "#241e19";
  ctx.fillRect(cx - 3, bottom + 3, 6, 3);
  ctx.fillRect(cx - 1, bottom + 6, 3, 3);
  ctx.fillStyle = "#241e19";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  lines.forEach((l, i) => ctx.fillText(l, x + 8, y + 5 + i * 19));
}
