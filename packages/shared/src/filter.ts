// Word filter for alert text and TTS. Thai has no spaces between words, so this
// matches substrings rather than whole words. Streamers add their own list in settings.

/** A small starter list; streamers extend it. Kept mild on purpose. */
export const DEFAULT_BLOCKED_WORDS = ["ควย", "เหี้ย", "สัส", "เย็ด", "หี", "fuck", "nigger", "faggot"];

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildFilter(words: readonly string[]) {
  const list = [...new Set(words.map((w) => w.trim().toLowerCase()).filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );
  if (list.length === 0) return { mask: (s: string) => s, hits: () => 0 };
  const re = new RegExp(list.map(escapeRe).join("|"), "giu");
  return {
    mask: (s: string) => s.replace(re, (m) => "*".repeat([...m].length)),
    hits: (s: string) => (s.match(re) ?? []).length,
  };
}

/** Collapse whitespace and strip control characters and URLs before display/TTS. */
export function cleanMessage(s: string, { stripUrls = true } = {}): string {
  let out = s.replace(/[\u0000-\u001f\u007f​-‏‪-‮]/g, " ");
  if (stripUrls) out = out.replace(/https?:\/\/\S+/gi, " ");
  return out.replace(/\s+/g, " ").trim();
}
