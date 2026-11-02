import type { ChatLine, ChatPart } from "./types";

// Reads YouTube live chat the way the youtube.com chat window does: load the chat page
// once for its settings, then ask for new messages with the continuation it hands back.
// No Google account, API key or quota is needed for public chat. It is not an official
// API, so every step fails soft and the status says what happened.

export type YtTarget = { kind: "video"; id: string } | { kind: "handle"; handle: string } | { kind: "channel"; id: string };

/** Anything a streamer might paste: a watch/live/studio link, @handle, channel link or bare video id. */
export function parseYoutubeTarget(raw: string): YtTarget | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^@[\w.-]{3,30}$/.test(s)) return { kind: "handle", handle: s.slice(1) };
  if (/^[\w-]{11}$/.test(s)) return { kind: "video", id: s };
  let u: URL;
  try {
    u = new URL(/^https?:\/\//.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m)\./, "");
  if (host === "youtu.be") {
    const id = u.pathname.slice(1, 12);
    return /^[\w-]{11}$/.test(id) ? { kind: "video", id } : null;
  }
  if (host !== "youtube.com" && host !== "studio.youtube.com") return null;
  const v = u.searchParams.get("v");
  if (v && /^[\w-]{11}$/.test(v)) return { kind: "video", id: v };
  const seg = u.pathname.split("/").filter(Boolean);
  if ((seg[0] === "live" || seg[0] === "shorts" || seg[0] === "video") && /^[\w-]{11}$/.test(seg[1] ?? "")) {
    return { kind: "video", id: seg[1] };
  }
  if (seg[0]?.startsWith("@")) return { kind: "handle", handle: decodeURIComponent(seg[0].slice(1)) };
  if (seg[0] === "channel" && /^UC[\w-]{22}$/.test(seg[1] ?? "")) return { kind: "channel", id: seg[1] };
  return null;
}

export type HttpText = (url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) => Promise<string>;

export class YtError extends Error {
  constructor(public code: "not_live" | "no_chat" | "not_found" | "network") {
    super(code);
  }
}

const ORIGIN = "https://www.youtube.com";

/** The video id of the channel's current live stream. */
export async function resolveVideoId(t: YtTarget, get: HttpText): Promise<string> {
  if (t.kind === "video") return t.id;
  const html = await get(`${ORIGIN}/${t.kind === "handle" ? `@${encodeURIComponent(t.handle)}` : `channel/${t.id}`}/live`).catch(
    () => {
      throw new YtError("network");
    },
  );
  const id = liveVideoIdFromChannelPage(html);
  if (id === undefined) throw new YtError("not_found");
  if (id === null) throw new YtError("not_live");
  return id;
}

/** undefined = not a channel page; null = the channel isn't live right now. */
export function liveVideoIdFromChannelPage(html: string): string | null | undefined {
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (!canonical) return undefined;
  const v = canonical.match(/[?&]v=([\w-]{11})/)?.[1];
  if (!v) return null;
  // /@x/live also lands on upcoming streams; only a running one has chat worth reading.
  if (/"isLiveNow":\s*false/.test(html) && !/"isLiveNow":\s*true/.test(html)) return null;
  return v;
}

export type ChatSession = { apiKey: string; clientVersion: string; continuation: string; lines: ChatLine[] };

export function parseChatPage(html: string): ChatSession {
  const apiKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
  const clientVersion =
    html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1] ?? html.match(/"clientVersion":"([^"]+)"/)?.[1];
  const data = initialData(html) as { contents?: { liveChatRenderer?: LiveChatRenderer } } | null;
  const renderer = data?.contents?.liveChatRenderer;
  const continuation = renderer ? nextContinuation(renderer.continuations)?.continuation : undefined;
  if (!apiKey || !clientVersion || !continuation) throw new YtError("no_chat");
  return { apiKey, clientVersion, continuation, lines: parseActions(renderer?.actions ?? []).lines };
}

function initialData(html: string): unknown {
  const m = html.match(/(?:window\["ytInitialData"\]|var ytInitialData)\s*=\s*/);
  if (!m || m.index === undefined) return null;
  const start = m.index + m[0].length;
  const end = html.indexOf(";</script>", start);
  try {
    return JSON.parse(html.slice(start, end < 0 ? undefined : end));
  } catch {
    return null;
  }
}

type Cont = { continuation?: string; timeoutMs?: number };
type Conts = Array<Record<string, Cont | undefined>> | undefined;
type LiveChatRenderer = { continuations?: Conts; actions?: unknown[] };

function nextContinuation(c: Conts): Cont | undefined {
  const first = c?.[0];
  if (!first) return undefined;
  return first.invalidationContinuationData ?? first.timedContinuationData ?? first.reloadContinuationData;
}

export type Poll = { lines: ChatLine[]; deleted: string[]; continuation: string | null; timeoutMs: number };

/** One get_live_chat response. `continuation: null` means the chat has ended. */
export function parsePoll(json: unknown): Poll {
  const c = (json as { continuationContents?: { liveChatContinuation?: LiveChatRenderer } } | null)?.continuationContents
    ?.liveChatContinuation;
  const next = nextContinuation(c?.continuations);
  const { lines, deleted } = parseActions(c?.actions ?? []);
  return {
    lines,
    deleted,
    continuation: next?.continuation ?? null,
    timeoutMs: Math.min(Math.max(next?.timeoutMs ?? 5000, 1000), 10_000),
  };
}

// ---- messages ------------------------------------------------------------------------

type Runs = { simpleText?: string; runs?: Array<{ text?: string; emoji?: Emoji }> };
type Emoji = {
  emojiId?: string;
  shortcuts?: string[];
  isCustomEmoji?: boolean;
  image?: { thumbnails?: Array<{ url: string }> };
};
type Badge = { liveChatAuthorBadgeRenderer?: { icon?: { iconType?: string }; customThumbnail?: unknown } };
type Item = {
  id?: string;
  timestampUsec?: string;
  authorName?: Runs;
  authorPhoto?: { thumbnails?: Array<{ url: string }> };
  authorBadges?: Badge[];
  message?: Runs;
  headerSubtext?: Runs;
  headerPrimaryText?: Runs;
  purchaseAmountText?: Runs;
};

function partsOf(r: Runs | undefined): ChatPart[] {
  if (!r) return [];
  if (r.simpleText) return [{ t: "text", text: r.simpleText }];
  const out: ChatPart[] = [];
  for (const run of r.runs ?? []) {
    if (run.text) out.push({ t: "text", text: run.text });
    else if (run.emoji) {
      const e = run.emoji;
      const url = e.image?.thumbnails?.at(-1)?.url;
      // Standard emoji come as their own character; only channel emoji need a picture.
      if (!e.isCustomEmoji && e.emojiId) out.push({ t: "text", text: e.emojiId });
      else if (url) out.push({ t: "emoji", url, alt: e.shortcuts?.[0] ?? e.emojiId ?? "" });
    }
  }
  return out;
}

const plain = (r: Runs | undefined) =>
  partsOf(r)
    .map((p) => (p.t === "text" ? p.text : p.alt))
    .join("");

function lineOf(item: Item, kind: "text" | "paid" | "member"): ChatLine | null {
  if (!item.id) return null;
  const name = plain(item.authorName);
  let role: ChatLine["role"] = null;
  let verified = false;
  for (const b of item.authorBadges ?? []) {
    const r = b.liveChatAuthorBadgeRenderer;
    const icon = r?.icon?.iconType;
    if (icon === "OWNER") role = "owner";
    else if (icon === "MODERATOR" && role !== "owner") role = "mod";
    else if (icon === "VERIFIED") verified = true;
    else if (r?.customThumbnail && !role) role = "member";
  }
  return {
    id: item.id,
    platform: "youtube",
    name,
    user: name.replace(/^@/, "").toLowerCase(),
    color: null,
    avatar: item.authorPhoto?.thumbnails?.at(-1)?.url ?? null,
    parts: partsOf(item.message),
    role,
    verified,
    paid: kind === "paid" ? plain(item.purchaseAmountText) || null : null,
    member: kind === "member" ? plain(item.headerSubtext) || plain(item.headerPrimaryText) || null : null,
    at: item.timestampUsec ? Math.floor(Number(item.timestampUsec) / 1000) : Date.now(),
    receivedAt: Date.now(),
  };
}

export function parseActions(actions: unknown[]): { lines: ChatLine[]; deleted: string[] } {
  const lines: ChatLine[] = [];
  const deleted: string[] = [];
  for (const raw of actions) {
    const a = raw as Record<string, Record<string, unknown> | undefined>;
    const item = a.addChatItemAction?.item as Record<string, Item | undefined> | undefined;
    if (item) {
      const l = item.liveChatTextMessageRenderer
        ? lineOf(item.liveChatTextMessageRenderer, "text")
        : item.liveChatPaidMessageRenderer
          ? lineOf(item.liveChatPaidMessageRenderer, "paid")
          : item.liveChatPaidStickerRenderer
            ? lineOf(item.liveChatPaidStickerRenderer, "paid")
            : item.liveChatMembershipItemRenderer
              ? lineOf(item.liveChatMembershipItemRenderer, "member")
              : null;
      if (l) lines.push(l);
      continue;
    }
    const gone =
      (a.markChatItemAsDeletedAction?.targetItemId as string | undefined) ??
      (a.removeChatItemAction?.targetItemId as string | undefined);
    if (gone) deleted.push(gone);
  }
  return { lines, deleted };
}

// ---- the polling loop ----------------------------------------------------------------

export type YtStatus = "connecting" | "live" | "not_live" | "no_chat" | "not_found" | "error";

/**
 * Follows a channel or stream's chat until stopped. A channel that isn't live yet is
 * checked again every minute, so it can be set up before going live.
 */
export function connectYoutubeChat(
  target: YtTarget,
  get: HttpText,
  on: { lines: (l: ChatLine[]) => void; deleted: (ids: string[]) => void; status: (s: YtStatus) => void },
): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const wait = (ms: number) =>
    new Promise<void>((r) => {
      timer = setTimeout(r, ms);
    });

  void (async () => {
    while (!stopped) {
      on.status("connecting");
      let session: ChatSession;
      try {
        const id = await resolveVideoId(target, get);
        session = parseChatPage(await get(`${ORIGIN}/live_chat?is_popout=1&v=${id}`));
      } catch (e) {
        if (stopped) return;
        const code = e instanceof YtError ? e.code : "network";
        on.status(code === "network" ? "error" : code);
        await wait(code === "not_found" ? 120_000 : code === "network" ? 10_000 : 60_000);
        continue;
      }
      if (stopped) return;
      on.status("live");
      // The page carries recent history; show only the last few so OBS isn't flooded.
      if (session.lines.length) on.lines(session.lines.slice(-8));

      let continuation: string | null = session.continuation;
      let fails = 0;
      while (!stopped && continuation) {
        try {
          const body = JSON.stringify({
            context: { client: { clientName: "WEB", clientVersion: session.clientVersion, hl: "th", gl: "TH" } },
            continuation,
          });
          const text = await get(`${ORIGIN}/youtubei/v1/live_chat/get_live_chat?key=${session.apiKey}&prettyPrint=false`, {
            method: "POST",
            body,
            headers: { "Content-Type": "application/json" },
          });
          if (stopped) return;
          const p = parsePoll(JSON.parse(text));
          fails = 0;
          if (p.lines.length) on.lines(p.lines);
          if (p.deleted.length) on.deleted(p.deleted);
          continuation = p.continuation;
          if (continuation) await wait(p.timeoutMs);
        } catch {
          // A few misses in a row: start over from the chat page.
          if (++fails >= 3) break;
          await wait(3000 * fails);
        }
      }
      if (!stopped) {
        on.status(continuation ? "error" : "not_live");
        await wait(continuation ? 5000 : 30_000);
      }
    }
  })();

  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
