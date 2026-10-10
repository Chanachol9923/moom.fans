import type { PetSprite } from "./sprites";

// 12x12 pixel icons for gift units ("3 × corn"). Same palette idea as the pets.

const PALETTE = {
  k: "#241e19",
  y: "#e0a13a",
  w: "#fff6d8",
  d: "#b86b2a",
  r: "#d0543c",
  b: "#6b4428",
  g: "#5b8f45",
  s: "#9fc4d6",
};

const ICON_ROWS = {
  corn: [
    "............",
    ".....kk.....",
    "....kyyk....",
    "...kyywyk...",
    "...kyyyyk...",
    "...kywyyk...",
    "...kyyyyk...",
    "...kyywyk...",
    "....kyyk....",
    "...gkkkkg...",
    "..gg....gg..",
    "............",
  ],
  bread: [
    "............",
    "....kkkk....",
    "..kkyyyykk..",
    ".kyywyywyyk.",
    ".kyyyyyyyyk.",
    "kyywyywyyyyk",
    "kyyyyyyyyyyk",
    "kddddddddddk",
    ".kddddddddk.",
    "..kkkkkkkk..",
    "............",
    "............",
  ],
  coffee: [
    "............",
    "...w..w.....",
    "....w..w....",
    ".kkkkkkkk...",
    ".kwwwwwwkkk.",
    ".kbbbbbbk.k.",
    ".kbbbbbbk.k.",
    ".kbbbbbbkkk.",
    ".kbbbbbbk...",
    "..kbbbbk....",
    ".kkkkkkkkk..",
    "............",
  ],
  heart: [
    "............",
    "..kk....kk..",
    ".krrk..krrk.",
    "krwrrkkrrrrk",
    "krrrrrrrrrrk",
    "krrrrrrrrrrk",
    ".krrrrrrrrk.",
    "..krrrrrrk..",
    "...krrrrk...",
    "....krrk....",
    ".....kk.....",
    "............",
  ],
  fish: [
    "............",
    "............",
    "....kkkk....",
    "..kksssskk.k",
    ".ksswsssskkk",
    "kskssssssssk",
    ".ksssssssskk",
    "..kksssskk.k",
    "....kkkk....",
    "............",
    "............",
    "............",
  ],
} as const;

export type IconId = keyof typeof ICON_ROWS;
export const ICON_IDS = Object.keys(ICON_ROWS) as IconId[];

export function isIconId(v: unknown): v is IconId {
  return typeof v === "string" && v in ICON_ROWS;
}

/** Wrapped as a PetSprite so PixelSprite can draw it. */
export function iconSprite(id: IconId): PetSprite {
  const rows = [...ICON_ROWS[id]];
  return { palette: PALETTE, frames: { stand: rows, step: rows, sleep: rows } };
}

export const ICON_SIZE = 12;
export const ICON_ROWS_FOR_TEST = ICON_ROWS;
