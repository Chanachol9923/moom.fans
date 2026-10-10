import type { Locale } from "@/lib/i18n";
import type { OverlayPosition } from "@/lib/supabase/database.types";
import type { PetSprite } from "@/lib/pets/sprites";

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
