import { describe, expect, it } from "vitest";
import { parseClear, parsePrivmsg } from "@moom/shared/overlay/twitch";
import { chatVisible, DEFAULT_CHAT_STYLE, parseChatStyle } from "./style";
import { parseTwitchChannel, twitchLine, twitchParts } from "./twitch";
import { liveVideoIdFromChannelPage, parseChatPage, parsePoll, parseYoutubeTarget, YtError } from "./youtube";

describe("parseYoutubeTarget", () => {
  it("understands what streamers paste", () => {
    expect(parseYoutubeTarget("https://www.youtube.com/@moomfans")).toEqual({ kind: "handle", handle: "moomfans" });
    expect(parseYoutubeTarget("youtube.com/@moomfans/live")).toEqual({ kind: "handle", handle: "moomfans" });
    expect(parseYoutubeTarget("@moomfans")).toEqual({ kind: "handle", handle: "moomfans" });
    expect(parseYoutubeTarget("https://youtu.be/dQw4w9WgXcQ?t=3")).toEqual({ kind: "video", id: "dQw4w9WgXcQ" });
    expect(parseYoutubeTarget("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({ kind: "video", id: "dQw4w9WgXcQ" });
    expect(parseYoutubeTarget("https://www.youtube.com/live/dQw4w9WgXcQ?si=x")).toEqual({ kind: "video", id: "dQw4w9WgXcQ" });
    expect(parseYoutubeTarget("https://studio.youtube.com/video/dQw4w9WgXcQ/livestreaming")).toEqual({
      kind: "video",
      id: "dQw4w9WgXcQ",
    });
    expect(parseYoutubeTarget("https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv")).toEqual({
      kind: "channel",
      id: "UCabcdefghijklmnopqrstuv",
    });
  });

  it("rejects other sites and junk", () => {
    expect(parseYoutubeTarget("https://twitch.tv/moom")).toBeNull();
    expect(parseYoutubeTarget("hello world")).toBeNull();
    expect(parseYoutubeTarget("")).toBeNull();
  });
});

describe("channel /live page", () => {
  it("finds the running stream", () => {
    const html = '<link rel="canonical" href="https://www.youtube.com/watch?v=abcdefghijk">"isLiveNow":true';
    expect(liveVideoIdFromChannelPage(html)).toBe("abcdefghijk");
  });
  it("treats a channel page or an upcoming stream as not live", () => {
    expect(liveVideoIdFromChannelPage('<link rel="canonical" href="https://www.youtube.com/channel/UCx">')).toBeNull();
    expect(
      liveVideoIdFromChannelPage('<link rel="canonical" href="https://www.youtube.com/watch?v=abcdefghijk">"isLiveNow":false'),
    ).toBeNull();
  });
  it("says when it isn't a channel at all", () => {
    expect(liveVideoIdFromChannelPage("<html>404</html>")).toBeUndefined();
  });
});

const textItem = (id: string, name: string, runs: unknown[], badges: unknown[] = []) => ({
  addChatItemAction: {
    item: {
      liveChatTextMessageRenderer: {
        id,
        timestampUsec: "1700000000000000",
        authorName: { simpleText: name },
        authorPhoto: { thumbnails: [{ url: "a.jpg" }, { url: "b.jpg" }] },
        authorBadges: badges,
        message: { runs },
      },
    },
  },
});

describe("chat page and polls", () => {
  it("reads settings and the first continuation from the chat page", () => {
    const data = {
      contents: {
        liveChatRenderer: {
          continuations: [{ invalidationContinuationData: { continuation: "C1", timeoutMs: 5000 } }],
          actions: [textItem("m1", "@pim", [{ text: "hi" }])],
        },
      },
    };
    const html = `<script>ytcfg.set({"INNERTUBE_API_KEY":"KEY","INNERTUBE_CLIENT_VERSION":"2.2026"})</script><script>window["ytInitialData"] = ${JSON.stringify(data)};</script>`;
    const s = parseChatPage(html);
    expect(s).toMatchObject({ apiKey: "KEY", clientVersion: "2.2026", continuation: "C1" });
    expect(s.lines[0]).toMatchObject({ id: "m1", name: "@pim", user: "pim", avatar: "b.jpg", platform: "youtube" });
  });

  it("fails clearly when the stream has no chat", () => {
    expect(() => parseChatPage("<html></html>")).toThrow(YtError);
  });

  it("parses messages, emoji, badges, Super Chats and deletions", () => {
    const p = parsePoll({
      continuationContents: {
        liveChatContinuation: {
          continuations: [{ timedContinuationData: { continuation: "C2", timeoutMs: 99999 } }],
          actions: [
            textItem(
              "m2",
              "Mod",
              [{ text: "hey " }, { emoji: { emojiId: "😀", isCustomEmoji: false } }, { emoji: { isCustomEmoji: true, shortcuts: [":moom:"], image: { thumbnails: [{ url: "e.png" }] } } }],
              [{ liveChatAuthorBadgeRenderer: { icon: { iconType: "MODERATOR" } } }],
            ),
            {
              addChatItemAction: {
                item: {
                  liveChatPaidMessageRenderer: {
                    id: "p1",
                    authorName: { simpleText: "Rich" },
                    purchaseAmountText: { simpleText: "฿100.00" },
                    message: { runs: [{ text: "สู้ๆ" }] },
                  },
                },
              },
            },
            { markChatItemAsDeletedAction: { targetItemId: "m0" } },
          ],
        },
      },
    });
    expect(p.continuation).toBe("C2");
    expect(p.timeoutMs).toBe(10_000); // clamped
    expect(p.deleted).toEqual(["m0"]);
    expect(p.lines[0].role).toBe("mod");
    expect(p.lines[0].parts).toEqual([
      { t: "text", text: "hey " },
      { t: "text", text: "😀" },
      { t: "emoji", url: "e.png", alt: ":moom:" },
    ]);
    expect(p.lines[1]).toMatchObject({ id: "p1", paid: "฿100.00" });
  });

  it("reports the end of the chat", () => {
    expect(parsePoll({ continuationContents: { liveChatContinuation: { actions: [] } } }).continuation).toBeNull();
  });
});

describe("twitch", () => {
  it("takes channel names in any form", () => {
    expect(parseTwitchChannel("https://www.twitch.tv/Moom_Fans")).toBe("moom_fans");
    expect(parseTwitchChannel("@moom")).toBe("moom");
    expect(parseTwitchChannel("not a channel!")).toBeNull();
  });

  it("splits emotes by code point, so Thai text lines up", () => {
    expect(twitchParts("สวัสดี Kappa", "25:7-11")).toEqual([
      { t: "text", text: "สวัสดี " },
      { t: "emoji", url: "https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/2.0", alt: "Kappa" },
    ]);
    expect(twitchParts("hi", "25:0-9")).toEqual([{ t: "text", text: "hi" }]); // out of range
  });

  it("builds a line with role, colour and bits", () => {
    const m = parsePrivmsg(
      "@badges=moderator/1;bits=50;color=#FF0000;display-name=Nok;emotes=;id=abc :nok!nok@nok.tmi.twitch.tv PRIVMSG #moom :yo",
    )!;
    expect(twitchLine(m)).toMatchObject({ id: "abc", role: "mod", color: "#FF0000", paid: "50 bits", name: "Nok", user: "nok" });
  });

  it("reads moderation clears", () => {
    expect(parseClear("@login=x;target-msg-id=abc :tmi.twitch.tv CLEARMSG #moom :bad")).toEqual({ msgId: "abc" });
    expect(parseClear("@ban-duration=600 :tmi.twitch.tv CLEARCHAT #moom :Spammer")).toEqual({ user: "spammer" });
    expect(parseClear(":tmi.twitch.tv CLEARCHAT #moom")).toBeNull();
  });
});

describe("chat style", () => {
  it("cleans stored settings", () => {
    const s = parseChatStyle({ size: 999, look: "neon", colors: { text: "red", bg: "#ABCDEF" }, css: "</style><script>" });
    expect(s.size).toBe(64);
    expect(s.look).toBe("pixel");
    expect(s.colors.text).toBe(DEFAULT_CHAT_STYLE.colors.text);
    expect(s.colors.bg).toBe("#abcdef");
    expect(s.css).not.toContain("<");
  });

  it("hides bots and !commands but never paid messages", () => {
    const base = { id: "1", platform: "twitch", name: "x", color: null, avatar: null, role: null, verified: false, member: null, at: 0, receivedAt: 0 } as const;
    const s = DEFAULT_CHAT_STYLE;
    expect(chatVisible({ ...base, user: "nightbot", parts: [{ t: "text", text: "hi" }], paid: null }, s)).toBe(false);
    expect(chatVisible({ ...base, user: "a", parts: [{ t: "text", text: "!song" }], paid: null }, s)).toBe(false);
    expect(chatVisible({ ...base, user: "a", parts: [{ t: "text", text: "!song" }], paid: "100 bits" }, s)).toBe(true);
    expect(chatVisible({ ...base, user: "a", parts: [{ t: "text", text: "hello" }], paid: null }, s)).toBe(true);
  });
});
