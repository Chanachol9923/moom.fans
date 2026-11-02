// One chat message as the OBS chat page draws it, from YouTube or Twitch.
// Plain JSON: it crosses the local WebSocket to OBS.

export type ChatPlatform = "youtube" | "twitch";

export type ChatPart = { t: "text"; text: string } | { t: "emoji"; url: string; alt: string };

export type ChatLine = {
  id: string;
  platform: ChatPlatform;
  name: string;
  /** Lower-case handle without "@", for matching pets and moderation. */
  user: string;
  /** The chatter's own colour (Twitch), if any. */
  color: string | null;
  avatar: string | null;
  parts: ChatPart[];
  role: "owner" | "mod" | "member" | null;
  verified: boolean;
  /** Super Chat / Super Sticker amount as shown by YouTube, e.g. "฿100.00". */
  paid: string | null;
  /** Membership join or gift line. */
  member: string | null;
  at: number;
  /** When this app got it (Date.now()); fading counts from here. */
  receivedAt: number;
};

/** The plain text of a line, for pets and the word filter. */
export function lineText(l: ChatLine): string {
  return l.parts.map((p) => (p.t === "text" ? p.text : p.alt)).join("");
}
