/**
 * Moom's mascot: a little black spider that lives in the top corner of the room.
 * The body is drawn in the page's ink colour, so it is black on light pages and cream
 * in dark mode; the eyes stay yellow.
 */
import type { PetSprite } from "./pets/sprites";

const INK = "var(--ink, #241e19)";
const EYE = "#f0b030";

/** 22 x 15. Stand, a walking step, and eyes shut (blink / asleep). */
export const MASCOT: PetSprite = {
  palette: { k: INK, y: EYE },
  frames: {
    stand: [
      "...............k......",
      "..............k.k.....",
      "........kkkkkk...k....",
      "...k...kkkkkkkk.......",
      "..k.k.kkkkkkkkkkkkk...",
      ".k...kkkkkkkkkkk...k..",
      "......kkkkkkkkkkkk..k.",
      "..kkkkkkkkkkkkkk..k...",
      ".k....kkkkkkkykk...k..",
      "k...kkkkykkkkkkk....k.",
      "...k...kkkkkkkk.k.....",
      "..k...k.kk...kk..k....",
      ".k...k....k.k....k....",
      ".....k...........k....",
      ".....k...........k....",
    ],
    step: [
      "...............k......",
      "..............k.k.....",
      "........kkkkkk...k....",
      "...k...kkkkkkkk.......",
      "..k.k.kkkkkkkkkkkkk...",
      ".k...kkkkkkkkkkk...k..",
      "......kkkkkkkkkkkk..k.",
      "..kkkkkkkkkkkkkk..k...",
      ".k....kkkkkkkykk...k..",
      "k...kkkkykkkkkkk....k.",
      "...k...kkkkkkkk.k.....",
      "..k...k.kkk.kkk..k....",
      ".k...k...........k....",
      ".................k....",
      ".................k....",
    ],
    sleep: [
      "...............k......",
      "..............k.k.....",
      "........kkkkkk...k....",
      "...k...kkkkkkkk.......",
      "..k.k.kkkkkkkkkkkkk...",
      ".k...kkkkkkkkkkk...k..",
      "......kkkkkkkkkkkk..k.",
      "..kkkkkkkkkkkkkk..k...",
      ".k....kkkkkkkkkk...k..",
      "k...kkkkkkkkkkkk....k.",
      "...k...kkkkkkkk.k.....",
      "..k...k.kk...kk..k....",
      ".k...k....k.k....k....",
      ".....k...........k....",
      ".....k...........k....",
    ],
  },
};

const WEB = [
  "ss....s.....s.....s.....s.....s...",
  "ssss..s.....s.....s.....s.....s...",
  ".ss.sss.....s.....s.....s.....s...",
  ".s.s.s.ss..s......s....s.....s....",
  "..s.s....sss.....s.....s.....s....",
  "..ss.s.....sss...s.....s.....s....",
  "sss...s...s...ssss.....s.....s....",
  "...s...s.s.......ss...s......s....",
  "...s....s.......s..ssss......s....",
  "....s..s.s......s.....ss....s.....",
  "....s.s...s....s.....s..sss.s.....",
  "...sss.....s..s......s.....ss.....",
  "sss..s......s.s.....s....k.s.ss...",
  ".....s.......s.....s....k.ks......",
  "......s....ss.s...kkkkkk..sk......",
  "......s...s..k.s.kkkkkkkks........",
  "......s.ss..k.k.kkkkkkkkkkkkk.....",
  "....ssss...k...kkkkkkkkkkk...k....",
  "ssss...s.......skkkkkkkkkkkk..k...",
  "........s...kkkkkkkkkkkkkk..k.....",
  "........s..kss..kkkkkkkykk...k....",
  "........s.ks..kkkkykkkkkkk....k...",
  ".......sss...k...kkkkkkkk.k.......",
  "...ssss..s..k...k.kk...kk..k......",
  "sss.......sk...k.s..k.k....k......",
  "..........s....ks..........k......",
  "..........s...sk...........k......",
  "...........sss....................",
  ".........sss......................",
  "...ssssss...s.....................",
  "sss.........s.....................",
  "..................................",
  "..................................",
  "..................................",
];

/** The mascot sitting in a corner web (34 x 34; the corner is top left). */
export const MASCOT_WEB: PetSprite = {
  palette: { k: INK, y: EYE, s: "color-mix(in srgb, var(--ink, #241e19) 28%, transparent)" },
  frames: { stand: WEB, step: WEB, sleep: WEB },
};

/** The 16 x 16 pet version, for the OBS screen and the pets page. `a` is the eyes (the pet's accent colour). */
export const SPIDER_PET_STAND = [
  "................",
  "................",
  "................",
  "............b...",
  "...b.......b.b..",
  "..b.b.bbbbb...b.",
  ".b...bbbbbbb....",
  "....bbbbbbbbbbb.",
  ".bbbbbbbbbbbb..b",
  "b...bbbbbbabbb..",
  "...bbbabbbbbb.b.",
  "..b.bbbbbbbbb..b",
  ".b.b.bbbbbbb.b..",
  "b..b..b...b..b..",
  "...b...b.b...b..",
  "...b.........b..",
];
export const SPIDER_PET_LEGS: [string, string] = ["..b..........b..", "..b..........b.."];
