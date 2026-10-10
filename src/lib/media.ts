// Media share: which links we accept and how long a tip buys.

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

export type MediaRef = { provider: "youtube"; id: string; start: number };

/** Accepts youtube.com/watch, youtu.be, /shorts/ and /embed/ links. */
export function parseMediaUrl(raw: string): MediaRef | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "music.youtube.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const m = url.pathname.match(/^\/(shorts|embed|live)\/([^/]+)/);
      if (m) id = m[2];
    }
  }
  if (!id || !YT_ID.test(id)) return null;
  const t = url.searchParams.get("t") ?? url.searchParams.get("start") ?? "0";
  return { provider: "youtube", id, start: parseStart(t) };
}

function parseStart(t: string): number {
  if (/^\d+$/.test(t)) return Number(t);
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

export function mediaSecondsFor(amount: number, bahtPerSecond: number, maxSeconds: number): number {
  if (!(amount > 0) || !(bahtPerSecond > 0)) return 0;
  return Math.min(maxSeconds, Math.floor(amount / bahtPerSecond + 1e-9));
}

export function canonicalMediaUrl(ref: MediaRef): string {
  return `https://www.youtube.com/watch?v=${ref.id}${ref.start ? `&t=${ref.start}` : ""}`;
}
