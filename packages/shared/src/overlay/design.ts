import { ALERT_ANIMATIONS, type AlertAnimation, type AlertLook, type AlertStyle, type AlertTier } from "../alerts";

// Alert design: tiers by amount and the streamer's own CSS. Shared by the server
// (parsing what's stored), the dashboard editor, the engine (which sound) and the stage.

export const MAX_TIERS = 8;
export const MAX_CSS = 20_000;
export const MAX_TITLE = 120;
const STYLES: AlertStyle[] = ["card", "compact", "banner"];
const HEX = /^#[0-9a-f]{6}$/i;

/** Stored form (overlay_settings.alert_tiers), with storage paths rather than URLs. */
export type StoredTier = {
  min_amount: number;
  media_path: string | null;
  sound_path: string | null;
  title: string;
  accent: string | null;
  animation: AlertAnimation;
  style: AlertStyle | null;
  look: AlertLook | null;
};

// ---- no-code look ------------------------------------------------------------------

export const DEFAULT_LOOK: AlertLook = {
  layout: "side",
  align: "left",
  font: "display",
  scale: 1,
  width: 560,
  imageSize: 64,
  frame: "pixel",
  radius: 12,
  shadow: "hard",
  outline: false,
  showBar: true,
  colors: {
    bg: "#f2ead7",
    bgAlpha: 100,
    border: "#241e19",
    text: "#241e19",
    name: "#2f7a6a",
    amount: "#241e19",
    message: "#5d5247",
  },
};

/** Starting points in the editor. */
export const LOOK_PRESETS: Record<"classic" | "floating" | "hype" | "glass", AlertLook> = {
  classic: DEFAULT_LOOK,
  // Just text over the game, like a subtitle.
  floating: {
    ...DEFAULT_LOOK,
    layout: "top",
    align: "center",
    font: "pixel",
    scale: 1.3,
    imageSize: 160,
    frame: "none",
    shadow: "none",
    outline: true,
    showBar: false,
    colors: { bg: "#000000", bgAlpha: 0, border: "#000000", text: "#ffffff", name: "#ffd166", amount: "#7ee8c4", message: "#ffffff" },
  },
  // Big centred card for the top tier.
  hype: {
    ...DEFAULT_LOOK,
    layout: "top",
    align: "center",
    font: "pixel",
    scale: 1.7,
    width: 820,
    imageSize: 280,
    colors: { bg: "#241e19", bgAlpha: 92, border: "#e0a13a", text: "#f2ead7", name: "#e0a13a", amount: "#ffffff", message: "#d6c8a8" },
  },
  glass: {
    ...DEFAULT_LOOK,
    font: "body",
    frame: "rounded",
    radius: 18,
    shadow: "soft",
    colors: { bg: "#ffffff", bgAlpha: 72, border: "#ffffff", text: "#241e19", name: "#7b4a74", amount: "#241e19", message: "#4f5b70" },
  },
};

const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;
const num = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const hex = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v) ? v.toLowerCase() : fallback);

export function parseLook(v: unknown): AlertLook | null {
  if (!v || typeof v !== "object") return null;
  const l = v as Record<string, unknown>;
  const c = (l.colors && typeof l.colors === "object" ? l.colors : {}) as Record<string, unknown>;
  const D = DEFAULT_LOOK;
  return {
    layout: pick(l.layout, ["side", "top", "background", "text"] as const, D.layout),
    align: pick(l.align, ["left", "center", "right"] as const, D.align),
    font: pick(l.font, ["pixel", "display", "body"] as const, D.font),
    scale: Math.round(num(l.scale, 0.6, 2.5, D.scale) * 100) / 100,
    width: Math.round(num(l.width, 240, 1600, D.width)),
    imageSize: Math.round(num(l.imageSize, 24, 600, D.imageSize)),
    frame: pick(l.frame, ["pixel", "rounded", "none"] as const, D.frame),
    radius: Math.round(num(l.radius, 0, 60, D.radius)),
    shadow: pick(l.shadow, ["none", "soft", "hard"] as const, D.shadow),
    outline: l.outline === true,
    showBar: l.showBar !== false,
    colors: {
      bg: hex(c.bg, D.colors.bg),
      bgAlpha: Math.round(num(c.bgAlpha, 0, 100, D.colors.bgAlpha)),
      border: hex(c.border, D.colors.border),
      text: hex(c.text, D.colors.text),
      name: hex(c.name, D.colors.name),
      amount: hex(c.amount, D.colors.amount),
      message: hex(c.message, D.colors.message),
    },
  };
}

const VIDEO_EXT = /\.(webm|mp4)$/i;

export function mediaKindOf(path: string | null): "image" | "video" | null {
  if (!path) return null;
  return VIDEO_EXT.test(path) ? "video" : "image";
}

/**
 * Cleans whatever is in the database or came from the editor. `ownerPrefix` limits file
 * paths to the streamer's own folder, so nobody can point an overlay at someone else's files.
 */
export function parseStoredTiers(v: unknown, ownerPrefix?: string): StoredTier[] {
  if (!Array.isArray(v)) return [];
  const path = (p: unknown) =>
    typeof p === "string" && /^[\w\-./]{1,300}$/.test(p) && !p.includes("..") && (!ownerPrefix || p.startsWith(ownerPrefix))
      ? p
      : null;
  const out: StoredTier[] = [];
  for (const raw of v.slice(0, MAX_TIERS)) {
    if (!raw || typeof raw !== "object") continue;
    const t = raw as Record<string, unknown>;
    const min = Number(t.min_amount);
    if (!Number.isFinite(min) || min < 0 || min > 1_000_000) continue;
    out.push({
      min_amount: Math.round(min * 100) / 100,
      media_path: path(t.media_path),
      sound_path: path(t.sound_path),
      title: typeof t.title === "string" ? t.title.slice(0, MAX_TITLE) : "",
      accent: typeof t.accent === "string" && HEX.test(t.accent) ? t.accent.toLowerCase() : null,
      animation: ALERT_ANIMATIONS.includes(t.animation as AlertAnimation) ? (t.animation as AlertAnimation) : "pop",
      style: STYLES.includes(t.style as AlertStyle) ? (t.style as AlertStyle) : null,
      look: parseLook(t.look),
    });
  }
  return out.sort((a, b) => a.min_amount - b.min_amount);
}

export function toAlertTiers(stored: StoredTier[], urlOf: (path: string | null) => string | null): AlertTier[] {
  return stored.map((t) => ({
    minAmount: t.min_amount,
    mediaUrl: urlOf(t.media_path),
    mediaKind: mediaKindOf(t.media_path),
    soundUrl: urlOf(t.sound_path),
    title: t.title,
    accent: t.accent,
    animation: t.animation,
    style: t.style,
    look: t.look,
  }));
}

/** The tier for this amount: the highest minAmount at or below it. Tiers must be sorted. */
export function tierFor(tiers: AlertTier[] | undefined, amount: number): { tier: AlertTier; index: number } | null {
  let found: { tier: AlertTier; index: number } | null = null;
  // `undefined` from an older server or app build that predates tiers.
  (tiers ?? []).forEach((tier, index) => {
    if (amount >= tier.minAmount) found = { tier, index };
  });
  return found;
}

/**
 * The CSS goes into a <style> element. Escaping "<" keeps "</style>" from ending it early;
 * `\3c ` is the same character to the CSS parser, so content: "<3" still renders.
 */
export function safeCss(css: string): string {
  return css.slice(0, MAX_CSS).replace(/</g, "\\3c ");
}
