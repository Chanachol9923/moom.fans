// 16x16 pixel pets. Each frame is 16 strings of 16 chars; each char is a palette slot
// and "." is transparent. Slots:
//   k outline   b body   d body shade   a accent   w light   e eye   y beak/feet   p pink

export const SPRITE_SIZE = 16;
export const MAX_PETS = 8;

export type SpriteFrames = { stand: string[]; step: string[]; sleep: string[] };

export type PetSprite = {
  palette: Record<string, string>;
  frames: SpriteFrames;
};

export type PresetSpecies = "bird" | "cat" | "dog" | "slime";

const BLANK = ".".repeat(SPRITE_SIZE);

/** Sleeping = eyes shut, and legged pets sit down (feet rows dropped, body shifted down). */
function sleepFrom(stand: string[], legRows: number): string[] {
  const body = legRows ? [...Array(legRows).fill(BLANK), ...stand.slice(0, SPRITE_SIZE - legRows)] : [...stand];
  return body.map((row) => row.replace(/e/g, "d"));
}

function withLegs(stand: string[], legs: [string, string]): string[] {
  return [...stand.slice(0, SPRITE_SIZE - 2), ...legs];
}

const BIRD_STAND = [
  BLANK,
  BLANK,
  "........kkk.....",
  ".......kbbbk....",
  "......kbbbekk...",
  "......kbbbbkyy..",
  "......kaabbkk...",
  ".....kaaabbk....",
  "..kkkbbbbbbbk...",
  ".kddddbbbwwwbk..",
  "kdddddbbwwwwbk..",
  ".kdddddbbwwwbk..",
  "..kkddddbbbbk...",
  "....kkkkkkkk....",
  "......y..y......",
  ".....yy..yy.....",
];

const CAT_STAND = [
  BLANK,
  ".........k...k..",
  "........kak.kak.",
  "........kbbkbbk.",
  "........kbbbbbk.",
  "..k.....kebbebk.",
  ".kbk....kbbpbbk.",
  ".kbk.....kwwwk..",
  "..kbk..kkkbbbk..",
  "..kbkkkbbbbbbbk.",
  "...kbbbdbbdbbbk.",
  "...kbbbdbbdbbbk.",
  "...kbbbbbbbbbbk.",
  "...kbkkkkkkkbkk.",
  "...kbk.....kbk..",
  "...kkk.....kkk..",
];

const DOG_STAND = [
  BLANK,
  BLANK,
  ".........kkkk...",
  "........kbbbbk..",
  ".......kabebbbk.",
  ".......kabbbbbbk",
  ".......kabbbbwkk",
  "........kkbbbbk.",
  ".k.......kbbbk..",
  ".kk..kkkkbbbbk..",
  "..kkkbbbbbbbbk..",
  "...kbbbwwwbbbk..",
  "...kbbbwwwbbbk..",
  "...kbkkkkkkbk...",
  "...kbk....kbk...",
  "...kkk....kkk...",
];

const SLIME_STAND = [
  BLANK,
  BLANK,
  BLANK,
  BLANK,
  BLANK,
  "......kkkk......",
  "....kkbbbbkk....",
  "...kbbwbbbbbk...",
  "..kbbwbbbbbbbk..",
  "..kbbbbebbebbk..",
  ".kbbbbbbbbbbbbk.",
  ".kbbbbbkkbbbbbk.",
  ".kdbbbbbbbbbbdk.",
  "..kddddddddddk..",
  "...kkkkkkkkkk...",
  BLANK,
];

const SLIME_SQUISH = [
  BLANK,
  BLANK,
  BLANK,
  BLANK,
  BLANK,
  BLANK,
  "......kkkk......",
  "...kkbwbbbbbkk..",
  ".kbbwbbbbbbbbbk.",
  ".kbbbbbebbebbbk.",
  ".kbbbbbbkkbbbbk.",
  "kdbbbbbbbbbbbbdk",
  ".kddddddddddddk.",
  "..kkkkkkkkkkkk..",
  BLANK,
  BLANK,
];

export const PRESETS: Record<PresetSpecies, PetSprite> = {
  bird: {
    palette: { k: "#241e19", b: "#8a97ab", d: "#5f6b80", a: "#3f8f7a", w: "#dfe2e6", e: "#241e19", y: "#e0a13a" },
    frames: {
      stand: BIRD_STAND,
      step: withLegs(BIRD_STAND, [".....y....y.....", "....yy....yy...."]),
      sleep: sleepFrom(BIRD_STAND, 2),
    },
  },
  cat: {
    palette: { k: "#241e19", b: "#e39b4d", d: "#b86b2a", a: "#e8a0a8", w: "#f4e3cf", e: "#241e19", p: "#d9727f" },
    frames: {
      stand: CAT_STAND,
      step: withLegs(CAT_STAND, ["..kbk.......kbk.", "..kkk.......kkk."]),
      sleep: sleepFrom(CAT_STAND, 2),
    },
  },
  dog: {
    palette: { k: "#241e19", b: "#c8a27a", d: "#9c7a55", a: "#7a5236", w: "#f2e6d6", e: "#241e19" },
    frames: {
      stand: DOG_STAND,
      step: withLegs(DOG_STAND, ["..kbk......kbk..", "..kkk......kkk.."]),
      sleep: sleepFrom(DOG_STAND, 2),
    },
  },
  slime: {
    palette: { k: "#241e19", b: "#7cc36a", d: "#4f9a45", w: "#d8f5c8", e: "#241e19" },
    frames: { stand: SLIME_STAND, step: SLIME_SQUISH, sleep: sleepFrom(SLIME_STAND, 0) },
  },
};

export const PRESET_SPECIES = Object.keys(PRESETS) as PresetSpecies[];

export function isPresetSpecies(v: string): v is PresetSpecies {
  return v in PRESETS;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export function darken(hex: string, amount = 0.28): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => Math.round(((n >> shift) & 255) * (1 - amount));
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Final sprite for a pet row: preset + colour overrides, or a custom drawing.
 * Overrides: { body, accent }. The shade colour follows the body colour.
 */
export function resolveSprite(species: string, palette: unknown, custom: unknown): PetSprite | null {
  if (species === "custom") return isPetSprite(custom) ? custom : null;
  if (!isPresetSpecies(species)) return null;
  const base = PRESETS[species];
  const over = (palette && typeof palette === "object" ? palette : {}) as Record<string, unknown>;
  const next = { ...base.palette };
  if (typeof over.body === "string" && HEX.test(over.body)) {
    next.b = over.body;
    next.d = darken(over.body);
  }
  if (typeof over.accent === "string" && HEX.test(over.accent)) next.a = over.accent;
  return { palette: next, frames: base.frames };
}

export function isPetSprite(v: unknown): v is PetSprite {
  if (!v || typeof v !== "object") return false;
  const s = v as PetSprite;
  if (!s.palette || typeof s.palette !== "object" || !s.frames) return false;
  if (!Object.values(s.palette).every((c) => typeof c === "string" && HEX.test(c))) return false;
  return (["stand", "step", "sleep"] as const).every(
    (f) =>
      Array.isArray(s.frames[f]) &&
      s.frames[f].length === SPRITE_SIZE &&
      s.frames[f].every(
        (row) =>
          typeof row === "string" &&
          row.length === SPRITE_SIZE &&
          [...row].every((c) => c === "." || c in s.palette),
      ),
  );
}

/** Draw one frame onto a 2D canvas context at (x, y), `scale` screen px per sprite px. */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  sprite: PetSprite,
  frame: keyof SpriteFrames,
  x: number,
  y: number,
  scale: number,
  flip = false,
) {
  const rows = sprite.frames[frame];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === ".") continue;
      const color = sprite.palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      const col = flip ? SPRITE_SIZE - 1 - c : c;
      ctx.fillRect(x + col * scale, y + r * scale, scale, scale);
    }
  }
}
