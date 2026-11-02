import { ALERT_ANIMATIONS, type AlertAnimation } from "@moom/shared/alerts";
import { cleanFontChoice, type FontChoice } from "@moom/shared/fonts";
import type { ChatLine } from "./types";

// How the OBS chat looks. Kept on this PC with the other device settings: chat runs in
// the app, so there's nothing for the website to show it on.

export type ChatLook = "pixel" | "bubble" | "clean";

export type ChatStyle = {
  look: ChatLook;
  font: FontChoice;
  /** Text size in px at 1080p. */
  size: number;
  maxLines: number;
  /** Hide a message this many seconds after it arrives; 0 keeps it until pushed out. */
  fadeAfter: number;
  avatars: boolean;
  /** Platform icon and owner/mod/member marks. */
  badges: boolean;
  /** Twitch name colours instead of one name colour. */
  userColors: boolean;
  align: "left" | "right";
  enter: AlertAnimation;
  colors: { text: string; name: string; bg: string; bgAlpha: number; highlight: string };
  /** Hide "!commands" and messages from these names (bots). */
  hideCommands: boolean;
  hideUsers: string[];
  css: string;
};

export const CHAT_LOOKS: ChatLook[] = ["pixel", "bubble", "clean"];

export const DEFAULT_CHAT_STYLE: ChatStyle = {
  look: "pixel",
  font: "body",
  size: 22,
  maxLines: 8,
  fadeAfter: 0,
  avatars: true,
  badges: true,
  userColors: true,
  align: "left",
  enter: "slide-left",
  colors: { text: "#241e19", name: "#2f7a6a", bg: "#f2ead7", bgAlpha: 92, highlight: "#e0a13a" },
  hideCommands: true,
  hideUsers: ["nightbot", "streamelements", "moobot", "fossabot", "streamlabs"],
  css: "",
};

/** Ready-made starting points; everything stays editable afterwards. */
export const CHAT_PRESETS: Record<"paper" | "night" | "clean", Partial<ChatStyle>> = {
  paper: { look: "pixel", colors: DEFAULT_CHAT_STYLE.colors },
  night: {
    look: "bubble",
    colors: { text: "#f4f1ea", name: "#9fc4d6", bg: "#1b1a2a", bgAlpha: 80, highlight: "#e0a13a" },
  },
  clean: {
    look: "clean",
    avatars: false,
    colors: { text: "#ffffff", name: "#ffd166", bg: "#000000", bgAlpha: 0, highlight: "#ff7a59" },
  },
};

const HEX = /^#[0-9a-f]{6}$/i;
const num = (v: unknown, min: number, max: number, fb: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb;
};

/** Anything stored (or sent) becomes a valid style. */
export function parseChatStyle(v: unknown): ChatStyle {
  const s = (v && typeof v === "object" ? v : {}) as Partial<ChatStyle>;
  const d = DEFAULT_CHAT_STYLE;
  const c = (s.colors ?? {}) as Partial<ChatStyle["colors"]>;
  const col = (x: unknown, fb: string) => (typeof x === "string" && HEX.test(x) ? x.toLowerCase() : fb);
  return {
    look: CHAT_LOOKS.includes(s.look as ChatLook) ? (s.look as ChatLook) : d.look,
    font: cleanFontChoice(s.font, d.font),
    size: Math.round(num(s.size, 12, 64, d.size)),
    maxLines: Math.round(num(s.maxLines, 1, 30, d.maxLines)),
    fadeAfter: Math.round(num(s.fadeAfter, 0, 600, d.fadeAfter)),
    avatars: typeof s.avatars === "boolean" ? s.avatars : d.avatars,
    badges: typeof s.badges === "boolean" ? s.badges : d.badges,
    userColors: typeof s.userColors === "boolean" ? s.userColors : d.userColors,
    align: s.align === "right" ? "right" : "left",
    enter: ALERT_ANIMATIONS.includes(s.enter as AlertAnimation) ? (s.enter as AlertAnimation) : d.enter,
    colors: {
      text: col(c.text, d.colors.text),
      name: col(c.name, d.colors.name),
      bg: col(c.bg, d.colors.bg),
      bgAlpha: Math.round(num(c.bgAlpha, 0, 100, d.colors.bgAlpha)),
      highlight: col(c.highlight, d.colors.highlight),
    },
    hideCommands: typeof s.hideCommands === "boolean" ? s.hideCommands : d.hideCommands,
    hideUsers: Array.isArray(s.hideUsers)
      ? s.hideUsers.filter((u): u is string => typeof u === "string").map((u) => u.trim().replace(/^@/, "").toLowerCase()).filter(Boolean).slice(0, 50)
      : d.hideUsers,
    // Only ever placed in a <style> on the OBS page; keep it from closing the tag.
    css: typeof s.css === "string" ? s.css.slice(0, 20_000).replace(/</g, "\\3c ") : "",
  };
}

/** Whether a line should be shown at all under this style. */
export function chatVisible(l: ChatLine, s: ChatStyle): boolean {
  if (s.hideUsers.includes(l.user)) return false;
  if (s.hideCommands && !l.paid && l.parts[0]?.t === "text" && l.parts[0].text.trimStart().startsWith("!")) return false;
  return true;
}
