// Fonts streamers can pick for their alerts and tip page.
//
// A choice is a short string:
//   "pixel" | "display" | "body"   Moom's own (always loaded)
//   "g:<Family>"                   a Google Font from GOOGLE_FONTS, loaded on demand
//   "brand"                        the streamer's uploaded font file
//   "default"                      whatever the surface uses normally

export type FontChoice = string;

type GoogleFont = { family: string; thai: boolean; kind: "sans" | "serif" | "display" | "hand" | "pixel" };

/** Every one supports Latin; `thai` marks those with Thai glyphs too. */
export const GOOGLE_FONTS: GoogleFont[] = [
  { family: "Kanit", thai: true, kind: "sans" },
  { family: "Prompt", thai: true, kind: "sans" },
  { family: "Mitr", thai: true, kind: "sans" },
  { family: "Sarabun", thai: true, kind: "sans" },
  { family: "Noto Sans Thai", thai: true, kind: "sans" },
  { family: "Bai Jamjuree", thai: true, kind: "sans" },
  { family: "K2D", thai: true, kind: "sans" },
  { family: "Athiti", thai: true, kind: "sans" },
  { family: "Krub", thai: true, kind: "sans" },
  { family: "Niramit", thai: true, kind: "sans" },
  { family: "Chakra Petch", thai: true, kind: "display" },
  { family: "Chonburi", thai: true, kind: "display" },
  { family: "Fahkwang", thai: true, kind: "display" },
  { family: "Mali", thai: true, kind: "hand" },
  { family: "Itim", thai: true, kind: "hand" },
  { family: "Sriracha", thai: true, kind: "hand" },
  { family: "Pattaya", thai: true, kind: "hand" },
  { family: "Charm", thai: true, kind: "hand" },
  { family: "Charmonman", thai: true, kind: "hand" },
  { family: "Pridi", thai: true, kind: "serif" },
  { family: "Trirong", thai: true, kind: "serif" },
  { family: "Taviraj", thai: true, kind: "serif" },
  { family: "Noto Serif Thai", thai: true, kind: "serif" },
  { family: "Pixelify Sans", thai: false, kind: "pixel" },
  { family: "Press Start 2P", thai: false, kind: "pixel" },
  { family: "Silkscreen", thai: false, kind: "pixel" },
  { family: "VT323", thai: false, kind: "pixel" },
  { family: "DotGothic16", thai: false, kind: "pixel" },
];

const FAMILIES = new Set(GOOGLE_FONTS.map((f) => f.family));
export const BRAND_FONT_FAMILY = "MoomBrand";

/** Keeps a stored choice only if we can actually load it. */
export function cleanFontChoice(v: unknown, fallback: FontChoice): FontChoice {
  if (v === "pixel" || v === "display" || v === "body" || v === "brand" || v === "default") return v;
  if (typeof v === "string" && v.startsWith("g:") && FAMILIES.has(v.slice(2))) return v;
  return fallback;
}

/** CSS font-family for a choice. Thai always falls back to Moom's Thai faces. */
export function fontStack(choice: FontChoice, fallback = "var(--font-thai-body), system-ui, sans-serif"): string {
  if (choice === "pixel") return "var(--font-pixel), var(--font-thai-display), monospace";
  if (choice === "display") return "var(--font-thai-display), var(--font-pixel), sans-serif";
  if (choice === "body") return "var(--font-thai-body), system-ui, sans-serif";
  if (choice === "brand") return `"${BRAND_FONT_FAMILY}", var(--font-thai-body), system-ui, sans-serif`;
  if (choice.startsWith("g:")) return `"${choice.slice(2)}", var(--font-thai-display), var(--font-thai-body), sans-serif`;
  return fallback;
}

/**
 * Just the family name, for overriding a font variable in place. Only Google and brand
 * fonts: Moom's built-in faces are self-hosted under hashed names and are the defaults anyway.
 */
export function fontFamilyName(choice: FontChoice): string | null {
  if (choice === "brand") return `"${BRAND_FONT_FAMILY}"`;
  if (choice.startsWith("g:") && FAMILIES.has(choice.slice(2))) return `"${choice.slice(2)}"`;
  return null;
}

/** One stylesheet URL for all the Google Fonts these choices need, or null. */
export function googleFontsHref(choices: Array<FontChoice | null | undefined>): string | null {
  const fams = [...new Set(choices.filter((c): c is string => !!c && c.startsWith("g:")).map((c) => c.slice(2)))]
    .filter((f) => FAMILIES.has(f))
    .sort();
  if (!fams.length) return null;
  // Single-weight families (pixel, some display faces) would 400 on a weight range.
  const ranged = (f: string) => !["Press Start 2P", "VT323", "DotGothic16", "Itim", "Sriracha", "Pattaya", "Chonburi"].includes(f);
  const q = fams
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}${ranged(f) ? ":wght@400;600;700" : ""}`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
}

/** @font-face for the streamer's own font file. */
export function brandFontCss(url: string | null | undefined): string {
  if (!url || !/^https?:\/\/[^\s"'()<>]+$/.test(url)) return "";
  return `@font-face{font-family:"${BRAND_FONT_FAMILY}";src:url("${url}");font-display:swap;}`;
}
