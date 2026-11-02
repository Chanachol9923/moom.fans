import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildFilter, DEFAULT_BLOCKED_WORDS } from "@moom/shared/filter";
import { connectTwitchChat } from "@moom/shared/overlay/twitch";
import { httpText } from "../platform";
import { chatVisible, type ChatStyle } from "./style";
import { parseTwitchChannel, twitchLine } from "./twitch";
import type { ChatLine } from "./types";
import { connectYoutubeChat, parseYoutubeTarget, type YtStatus } from "./youtube";

const KEEP = 50;

export type ChatStatus = { youtube: YtStatus | "off" | "bad_link"; twitch: string | null };

/** Reads YouTube and Twitch chat on this PC and keeps the latest lines, filtered. */
export function useChat({
  youtube,
  twitch,
  style,
  blockedWords,
  onLine,
}: {
  youtube: string;
  twitch: string | null;
  style: ChatStyle;
  blockedWords: string[];
  /** Every new visible line (pets speak them). */
  onLine?: (l: ChatLine) => void;
}) {
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [yt, setYt] = useState<YtStatus>("connecting");

  const filter = useMemo(() => buildFilter([...DEFAULT_BLOCKED_WORDS, ...blockedWords]), [blockedWords]);
  const latest = useRef({ filter, style, onLine });
  useEffect(() => {
    latest.current = { filter, style, onLine };
  });

  // Busy Twitch chats send many lines a second; draw them in one go every 100 ms.
  const pending = useRef<ChatLine[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
    },
    [],
  );

  const add = useCallback((incoming: ChatLine[]) => {
    const { filter: f, style: s, onLine: cb } = latest.current;
    const clean = incoming
      .filter((l) => chatVisible(l, s))
      .map((l) => ({
        ...l,
        name: f.mask(l.name),
        parts: l.parts.map((p) => (p.t === "text" ? { ...p, text: f.mask(p.text) } : p)),
      }));
    if (!clean.length) return;
    for (const l of clean) cb?.(l);
    pending.current.push(...clean);
    flushTimer.current ??= setTimeout(() => {
      flushTimer.current = null;
      const batch = pending.current.splice(0);
      setLines((prev) => {
        const seen = new Set(prev.map((l) => l.id));
        return [...prev, ...batch.filter((l) => !seen.has(l.id))].slice(-KEEP);
      });
    }, 100);
  }, []);

  const remove = useCallback((test: (l: ChatLine) => boolean) => setLines((prev) => prev.filter((l) => !test(l))), []);

  // Wait for typing to stop so a half-typed link doesn't start a connection per keystroke.
  const settled = useDebounced(youtube.trim(), 700);
  const ytTarget = useMemo(() => parseYoutubeTarget(settled), [settled]);
  const ytKey = ytTarget ? JSON.stringify(ytTarget) : "";
  useEffect(() => {
    if (!ytTarget) return;
    return connectYoutubeChat(ytTarget, httpText, {
      lines: add,
      deleted: (ids) => remove((l) => ids.includes(l.id)),
      status: setYt,
    });
    // ytKey stands for ytTarget's content
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytKey, add, remove]);
  const ytStatus: ChatStatus["youtube"] = !youtube.trim()
    ? "off"
    : settled !== youtube.trim()
      ? "connecting"
      : !ytTarget
        ? "bad_link"
        : yt;

  const twitchChannel = twitch ? parseTwitchChannel(twitch) : null;
  useEffect(() => {
    if (!twitchChannel) return;
    return connectTwitchChat(
      twitchChannel,
      (m) => add([twitchLine(m)]),
      (c) => remove((l) => l.platform === "twitch" && (l.id === c.msgId || l.user === c.user)),
    );
  }, [twitchChannel, add, remove]);

  /** A sample line so the look can be checked before going live. */
  const test = useCallback(
    (name: string, text: string, paid = false) =>
      add([
        {
          id: `test-${crypto.randomUUID()}`,
          platform: Math.random() < 0.5 ? "youtube" : "twitch",
          name,
          user: name.toLowerCase(),
          color: null,
          avatar: null,
          parts: [{ t: "text", text }],
          role: null,
          verified: false,
          paid: paid ? "฿100.00" : null,
          member: null,
          at: Date.now(),
          receivedAt: Date.now(),
        },
      ]),
    [add],
  );

  const clear = useCallback(() => setLines([]), []);

  return { lines, status: { youtube: ytStatus, twitch: twitchChannel } satisfies ChatStatus, test, clear };
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
