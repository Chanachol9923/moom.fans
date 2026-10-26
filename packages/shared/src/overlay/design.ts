import { ALERT_ANIMATIONS, type AlertAnimation, type AlertStyle, type AlertTier } from "../alerts";

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
};

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
