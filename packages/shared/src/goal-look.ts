import { cleanFontChoice, type FontChoice } from "./fonts";

// How the goal bar looks on stream (the OBS goal widget). Built in the dashboard without
// code, with the streamer's own CSS on top for anything the controls don't cover.

export type GoalLook = {
  /** Bar drawing: pixel blocks, one smooth fill, diagonal stripes, or a thin line. */
  bar: "segments" | "smooth" | "stripes" | "thin";
  /** Block count for "segments". */
  segments: number;
  /** Bar height in px at 1080p. */
  barHeight: number;
  /** Title and percent beside each other, title above everything, or everything centred. */
  layout: "row" | "stacked" | "center";
  font: FontChoice;
  numFont: FontChoice;
  weight: number;
  scale: number;
  frame: "pixel" | "rounded" | "none";
  radius: number;
  shadow: "none" | "soft" | "hard";
  show: { title: boolean; percent: boolean; amounts: boolean; deadline: boolean };
  colors: {
    bg: string;
    bgAlpha: number;
    border: string;
    title: string;
    text: string;
    /** "" = the account colour. */
    fill: string;
    track: string;
  };
  /** Dark outline around text, for reading straight over the game. */
  outline: boolean;
  css: string;
};

export const MAX_GOAL_CSS = 10_000;

export const DEFAULT_GOAL_LOOK: GoalLook = {
  bar: "segments",
  segments: 24,
  barHeight: 16,
  layout: "row",
  font: "pixel",
  numFont: "display",
  weight: 600,
  scale: 1,
  frame: "pixel",
  radius: 12,
  shadow: "hard",
  show: { title: true, percent: true, amounts: true, deadline: true },
  colors: { bg: "#f2ead7", bgAlpha: 100, border: "#241e19", title: "#241e19", text: "#554a3f", fill: "", track: "#241e19" },
  outline: false,
  css: "",
};

export const GOAL_PRESETS: Record<"classic" | "minimal" | "neon" | "candy", GoalLook> = {
  classic: DEFAULT_GOAL_LOOK,
  minimal: {
    ...DEFAULT_GOAL_LOOK,
    bar: "thin",
    barHeight: 8,
    layout: "stacked",
    font: "body",
    frame: "none",
    shadow: "none",
    outline: true,
    colors: { bg: "#000000", bgAlpha: 0, border: "#000000", title: "#ffffff", text: "#f2f2f2", fill: "#ffd166", track: "#ffffff" },
  },
  neon: {
    ...DEFAULT_GOAL_LOOK,
    bar: "smooth",
    barHeight: 20,
    font: "display",
    frame: "rounded",
    radius: 10,
    shadow: "soft",
    colors: { bg: "#15172a", bgAlpha: 92, border: "#5fd1b5", title: "#eef0fb", text: "#b6bad6", fill: "#5fd1b5", track: "#2c3058" },
  },
  candy: {
    ...DEFAULT_GOAL_LOOK,
    bar: "stripes",
    barHeight: 22,
    layout: "center",
    font: "g:Mali",
    numFont: "g:Mali",
    frame: "rounded",
    radius: 24,
    shadow: "none",
    colors: { bg: "#fff1f5", bgAlpha: 100, border: "#f4a7c0", title: "#7a2948", text: "#9b4a68", fill: "#f06292", track: "#fbd3df" },
  },
};

const HEX = /^#[0-9a-f]{6}$/i;
const num = (v: unknown, min: number, max: number, fb: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb;
};
const pick = <T extends string>(v: unknown, opts: readonly T[], fb: T): T => (opts.includes(v as T) ? (v as T) : fb);
const bool = (v: unknown, fb: boolean) => (typeof v === "boolean" ? v : fb);

/** Anything stored or sent becomes a valid look; null when there's nothing to parse. */
export function parseGoalLook(v: unknown): GoalLook | null {
  if (!v || typeof v !== "object") return null;
  const l = v as Record<string, unknown>;
  const D = DEFAULT_GOAL_LOOK;
  const c = (l.colors && typeof l.colors === "object" ? l.colors : {}) as Record<string, unknown>;
  const s = (l.show && typeof l.show === "object" ? l.show : {}) as Record<string, unknown>;
  const hex = (x: unknown, fb: string) => (typeof x === "string" && HEX.test(x) ? x.toLowerCase() : fb);
  return {
    bar: pick(l.bar, ["segments", "smooth", "stripes", "thin"] as const, D.bar),
    segments: Math.round(num(l.segments, 6, 60, D.segments)),
    barHeight: Math.round(num(l.barHeight, 4, 64, D.barHeight)),
    layout: pick(l.layout, ["row", "stacked", "center"] as const, D.layout),
    font: cleanFontChoice(l.font, D.font),
    numFont: cleanFontChoice(l.numFont, D.numFont),
    weight: Math.round(num(l.weight, 300, 900, D.weight) / 100) * 100,
    scale: Math.round(num(l.scale, 0.6, 2.5, D.scale) * 100) / 100,
    frame: pick(l.frame, ["pixel", "rounded", "none"] as const, D.frame),
    radius: Math.round(num(l.radius, 0, 60, D.radius)),
    shadow: pick(l.shadow, ["none", "soft", "hard"] as const, D.shadow),
    show: {
      title: bool(s.title, D.show.title),
      percent: bool(s.percent, D.show.percent),
      amounts: bool(s.amounts, D.show.amounts),
      deadline: bool(s.deadline, D.show.deadline),
    },
    colors: {
      bg: hex(c.bg, D.colors.bg),
      bgAlpha: Math.round(num(c.bgAlpha, 0, 100, D.colors.bgAlpha)),
      border: hex(c.border, D.colors.border),
      title: hex(c.title, D.colors.title),
      text: hex(c.text, D.colors.text),
      fill: c.fill === "" ? "" : hex(c.fill, D.colors.fill),
      track: hex(c.track, D.colors.track),
    },
    outline: l.outline === true,
    // Only ever placed in a <style> on the widget page; keep it from closing the tag.
    css: typeof l.css === "string" ? l.css.slice(0, MAX_GOAL_CSS).replace(/</g, "\\3c ") : "",
  };
}
