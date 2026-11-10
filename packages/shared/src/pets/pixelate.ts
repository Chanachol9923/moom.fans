import { SPRITE_SIZE, type PetSprite } from "./sprites";

/** The palette letters the pixel editor knows, in the order colours are handed out. */
export const PIXEL_SLOTS = ["k", "b", "d", "a", "w", "e", "y", "p"] as const;

type Rgb = { r: number; g: number; b: number; n: number };

const dist = (a: Rgb, b: Rgb) => (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
const hex = (c: Rgb) => `#${[c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

/**
 * A 16x16 RGBA bitmap (already scaled down) to an editable pet sprite: see-through
 * pixels stay empty, the rest is reduced to at most 8 colours by merging the two
 * closest colours until few enough are left (weighted by how many pixels use them).
 * The step frame is the same picture one pixel higher, so it bobs when walking.
 */
export function pixelsToSprite(rgba: Uint8ClampedArray | number[], alphaCut = 110): PetSprite {
  const size = SPRITE_SIZE;
  const px: Array<Rgb | null> = [];
  for (let i = 0; i < size * size; i++) {
    const a = rgba[i * 4 + 3];
    px.push(a < alphaCut ? null : { r: rgba[i * 4], g: rgba[i * 4 + 1], b: rgba[i * 4 + 2], n: 1 });
  }

  // Start from colours rounded to 5 bits per channel, so near-identical shades are one.
  const buckets = new Map<string, Rgb>();
  for (const p of px) {
    if (!p) continue;
    const key = `${p.r >> 3},${p.g >> 3},${p.b >> 3}`;
    const c = buckets.get(key);
    if (c) {
      c.r = (c.r * c.n + p.r) / (c.n + 1);
      c.g = (c.g * c.n + p.g) / (c.n + 1);
      c.b = (c.b * c.n + p.b) / (c.n + 1);
      c.n++;
    } else buckets.set(key, { ...p });
  }
  const colors = [...buckets.values()];
  while (colors.length > PIXEL_SLOTS.length) {
    let bi = 0;
    let bj = 1;
    let best = Infinity;
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const cost = dist(colors[i], colors[j]) * Math.min(colors[i].n, colors[j].n);
        if (cost < best) {
          best = cost;
          bi = i;
          bj = j;
        }
      }
    }
    const a = colors[bi];
    const b = colors[bj];
    const n = a.n + b.n;
    colors[bi] = { r: (a.r * a.n + b.r * b.n) / n, g: (a.g * a.n + b.g * b.n) / n, b: (a.b * a.n + b.b * b.n) / n, n };
    colors.splice(bj, 1);
  }
  // Most used colour gets the first letter, which is the editor's first brush.
  colors.sort((x, y) => y.n - x.n);

  const palette: Record<string, string> = {};
  colors.forEach((c, i) => (palette[PIXEL_SLOTS[i]] = hex(c)));
  const rows: string[] = [];
  for (let y = 0; y < size; y++) {
    let row = "";
    for (let x = 0; x < size; x++) {
      const p = px[y * size + x];
      if (!p) {
        row += ".";
        continue;
      }
      let k = 0;
      for (let i = 1; i < colors.length; i++) if (dist(p, colors[i]) < dist(p, colors[k])) k = i;
      row += PIXEL_SLOTS[k];
    }
    rows.push(row);
  }
  const step = [...rows.slice(1), ".".repeat(size)];
  return { palette, frames: { stand: rows, step, sleep: [...rows] } };
}
