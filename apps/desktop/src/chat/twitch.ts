import type { ChatMessage } from "@moom/shared/overlay/twitch";
import type { ChatLine, ChatPart } from "./types";

/** Twitch channel name from "name", "@name" or a twitch.tv link. */
export function parseTwitchChannel(raw: string): string | null {
  const s = raw.trim().replace(/^@/, "");
  const m = s.match(/^(?:https?:\/\/)?(?:www\.|m\.)?twitch\.tv\/(\w{3,25})/i) ?? s.match(/^(\w{3,25})$/);
  return m ? m[1].toLowerCase() : null;
}

/** Splits the text on the emote ranges in the `emotes` tag ("25:0-4,12-16/1902:6-10"). */
export function twitchParts(text: string, emotes: string | undefined): ChatPart[] {
  // Ranges count Unicode code points, not UTF-16 units, so Thai and emoji line up.
  const chars = [...text];
  const ranges: Array<{ from: number; to: number; id: string }> = [];
  for (const group of (emotes ?? "").split("/")) {
    const [id, spots] = group.split(":");
    if (!id || !spots) continue;
    for (const spot of spots.split(",")) {
      const [a, b] = spot.split("-").map(Number);
      if (Number.isInteger(a) && Number.isInteger(b) && a <= b && b < chars.length) ranges.push({ from: a, to: b, id });
    }
  }
  ranges.sort((x, y) => x.from - y.from);
  const out: ChatPart[] = [];
  let at = 0;
  for (const r of ranges) {
    if (r.from < at) continue;
    if (r.from > at) out.push({ t: "text", text: chars.slice(at, r.from).join("") });
    out.push({
      t: "emoji",
      url: `https://static-cdn.jtvnw.net/emoticons/v2/${encodeURIComponent(r.id)}/default/dark/2.0`,
      alt: chars.slice(r.from, r.to + 1).join(""),
    });
    at = r.to + 1;
  }
  if (at < chars.length) out.push({ t: "text", text: chars.slice(at).join("") });
  return out;
}

export function twitchLine(m: ChatMessage): ChatLine {
  const badges = m.tags.badges ?? "";
  const role: ChatLine["role"] = /(^|,)broadcaster\//.test(badges)
    ? "owner"
    : /(^|,)moderator\//.test(badges)
      ? "mod"
      : /(^|,)(subscriber|founder)\//.test(badges)
        ? "member"
        : null;
  // "/me waves" arrives wrapped in ACTION.
  const action = m.text.match(/^\u0001ACTION (.*)\u0001$/);
  const text = action ? action[1] : m.text;
  return {
    id: m.tags.id || crypto.randomUUID(),
    platform: "twitch",
    name: m.displayName,
    user: m.user,
    color: /^#[0-9a-f]{6}$/i.test(m.tags.color ?? "") ? m.tags.color : null,
    avatar: null,
    parts: twitchParts(text, m.tags.emotes),
    role,
    verified: /(^|,)partner\//.test(badges),
    paid: Number(m.tags.bits) > 0 ? `${m.tags.bits} bits` : null,
    member: null,
    at: Number(m.tags["tmi-sent-ts"]) || Date.now(),
    receivedAt: Date.now(),
  };
}
