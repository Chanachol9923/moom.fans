import type { Locale } from "@moom/shared/i18n";
import type { PetSprite } from "@moom/shared/pets/sprites";

export type OverlayPosition =
  | "top-left" | "top-center" | "top-right" | "center"
  | "bottom-left" | "bottom-center" | "bottom-right";

export type AlertKind = "tip" | "purchase" | "test";

/** Snapshot stored in alerts.payload and sent to the overlay. Text is already filtered. */
export type AlertPayload = {
  name: string;
  amount: number;
  message: string;
  productTitle: string | null;
  media: { id: string; start: number; seconds: number } | null;
  tts: boolean;
  locale: Locale;
  /** "3 × corn" gifts. Optional: alerts queued before this existed don't have it. */
  unit?: { name: string; qty: number; icon: string } | null;
  /** Prize wheel spin decided when the alert was queued. */
  wheel?: { items: string[]; result: number } | null;
  /** Poll option the supporter voted for. */
  vote?: string | null;
};

export type OverlayAlert = {
  id: string;
  kind: AlertKind;
  createdAt: string;
  payload: AlertPayload;
};

export type VtsRule = {
  min_amount: number;
  kind: "hotkey" | "item";
  /** hotkeyID for hotkeys, file name for items. */
  ref: string;
  label: string;
};

export type OverlayPet = {
  id: string;
  name: string;
  chatter: string | null;
  sprite: PetSprite;
};

export type AlertStyle = "card" | "compact" | "banner";

export const ALERT_ANIMATIONS = ["pop", "slide", "bounce", "shake", "fade", "none"] as const;
export type AlertAnimation = (typeof ALERT_ANIMATIONS)[number];

/** A no-code alert look built in the dashboard. Replaces the preset card styles when set. */
export type AlertLook = {
  /** Where the picture goes: beside the text, above it, behind it, or no picture. */
  layout: "side" | "top" | "background" | "text";
  align: "left" | "center" | "right";
  font: "pixel" | "display" | "body";
  /** Text size multiplier, 0.6..2.5. */
  scale: number;
  /** Card width in px at 1080p. */
  width: number;
  /** Picture height in px at 1080p. */
  imageSize: number;
  frame: "pixel" | "rounded" | "none";
  /** Corner radius for the rounded frame. */
  radius: number;
  shadow: "none" | "soft" | "hard";
  /** Dark outline around text, for reading straight over the game. */
  outline: boolean;
  showBar: boolean;
  colors: {
    bg: string;
    /** Background opacity 0..100. */
    bgAlpha: number;
    border: string;
    text: string;
    name: string;
    amount: string;
    message: string;
  };
};

/** One look for alerts from `minAmount` baht up. The highest tier a tip reaches wins. */
export type AlertTier = {
  minAmount: number;
  /** Image, GIF or short video shown in the alert. */
  mediaUrl: string | null;
  mediaKind: "image" | "video" | null;
  soundUrl: string | null;
  /** Headline template with {name} {amount} {product} {unit} {qty}; "" = the default text. */
  title: string;
  accent: string | null;
  animation: AlertAnimation;
  style: AlertStyle | null;
  /** Set = designed in the no-code editor; `style` is ignored. */
  look: AlertLook | null;
};

export type OverlayConfig = {
  position: OverlayPosition;
  alertStyle: AlertStyle;
  volume: number;
  displaySeconds: number;
  alertSoundUrl: string | null;
  ttsEnabled: boolean;
  mediaEnabled: boolean;
  vtsEnabled: boolean;
  vtsRules: VtsRule[];
  petsEnabled: boolean;
  twitchChannel: string | null;
  accent: string;
  locale: Locale;
  blockedWords: string[];
  /** Sorted by minAmount. Empty = one default look for everything. */
  tiers: AlertTier[];
  /** The streamer's own CSS for the OBS page. */
  customCss: string;
};

export type OverlayState = {
  streamer: { displayName: string; slug: string };
  config: OverlayConfig;
  alerts: OverlayAlert[];
  pets: OverlayPet[];
  realtime: { url: string; key: string; channel: string } | null;
};

/** Broadcast events on the overlay channel. They only carry hints; the overlay refetches. */
export type OverlayEvent =
  | { type: "alerts" }
  | { type: "config" }
  | { type: "control"; action: "panic" | "skip" | "resume" | "reload" };

export function isOverlayEvent(v: unknown): v is OverlayEvent {
  if (!v || typeof v !== "object") return false;
  const t = (v as { type?: unknown }).type;
  if (t === "alerts" || t === "config") return true;
  if (t === "control") {
    const a = (v as { action?: unknown }).action;
    return a === "panic" || a === "skip" || a === "resume" || a === "reload";
  }
  return false;
}
