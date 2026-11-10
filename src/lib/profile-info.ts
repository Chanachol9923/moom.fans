import { z } from "zod";

/** The name and details on the tip page, edited in Page design next to the preview. */
export type PageInfo = {
  displayName: string;
  bio: string;
  accent: string;
  links: Array<{ label: string; url: string }>;
  tipPresets: number[];
  minTip: number;
};

export const MAX_LINKS = 12;
export const MAX_PRESETS = 6;
export const DEFAULT_PRESETS = [20, 50, 100];

export const PageInfoSchema = z.object({
  displayName: z.string().trim().min(1).max(60),
  bio: z.string().trim().max(500),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  links: z.array(z.object({ label: z.string().max(200), url: z.string().max(500) })).max(50),
  tipPresets: z.array(z.number()).max(50),
  minTip: z.number().min(1).max(100000),
});

/** "youtube.com/@name" works too; only http(s) addresses with a real host are kept. */
export function normalizeUrl(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s) && !/^[a-z]+:/i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Drops empty or broken links; a link without a name is named after its site. */
export function normalizeLinks(list: Array<{ label: string; url: string }>) {
  const out: Array<{ label: string; url: string }> = [];
  for (const l of list) {
    const url = normalizeUrl(l.url);
    if (!url) continue;
    const label = l.label.trim() || new URL(url).hostname.replace(/^www\./, "");
    out.push({ label: label.slice(0, 40), url });
    if (out.length === MAX_LINKS) break;
  }
  return out;
}

/** Whole baht, no repeats, smallest first; falls back to 20 / 50 / 100 when none are left. */
export function normalizePresets(list: number[]) {
  const ok = [...new Set(list.filter((n) => Number.isInteger(n) && n > 0 && n <= 100000))].sort((a, b) => a - b);
  return ok.length ? ok.slice(0, MAX_PRESETS) : DEFAULT_PRESETS;
}
