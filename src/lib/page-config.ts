import { z } from "zod";
import { ICON_IDS, type IconId } from "@moom/shared/pets/icons";
import { cleanFontChoice, fontFamilyName } from "@moom/shared/fonts";

// Storefront design, stored in profiles.page. Every field has a default and parsing
// never throws, so an old or hand-edited value can't break a public page.

export const THEMES = {
  pigeon: { paper: "#f2ead7", paper2: "#e6dbc2", paper3: "#d6c8a8", ink: "#241e19", inkSoft: "#554a3f", inkFaint: "#6f6354", field: "#fffaf0" },
  night: { paper: "#1f2230", paper2: "#2a2e3f", paper3: "#3a3f55", ink: "#f1ead8", inkSoft: "#d2cab8", inkFaint: "#a8a2b4", field: "#14161f" },
  sakura: { paper: "#fbeef0", paper2: "#f4dbe0", paper3: "#e7c0c8", ink: "#3a2329", inkSoft: "#62424b", inkFaint: "#7e5e67", field: "#fffafb" },
  matcha: { paper: "#eef2df", paper2: "#dfe6c7", paper3: "#c8d3a6", ink: "#22301c", inkSoft: "#435238", inkFaint: "#5c6950", field: "#fbfdf4" },
  arcade: { paper: "#fff7d6", paper2: "#ffe9a3", paper3: "#f4d06f", ink: "#1b1a3a", inkSoft: "#3f3c66", inkFaint: "#5c5986", field: "#fffdf3" },
} as const;

export type ThemeId = keyof typeof THEMES;
export const THEME_IDS = Object.keys(THEMES) as ThemeId[];

export const BACKGROUNDS = ["dots", "grid", "checker", "plain", "image"] as const;
export const MAX_PAGE_CSS = 10_000;

/**
 * The streamer's CSS for their public page. It can restyle anything on the page, but it
 * can't break out of the <style> tag, pull in other stylesheets, or load images from
 * other sites (which would let a third party log every viewer's IP).
 */
export function safePageCss(css: string): string {
  const storage = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/`;
  return css
    .replace(/</g, "\\3c ")
    .replace(/@import[^;]*;?/gi, "")
    .replace(/url\(\s*(['"]?)([^'")]*)\1\s*\)/gi, (m, _q, u: string) =>
      (storage.length > 30 && u.startsWith(storage)) || u.startsWith("data:image/") ? m : "none",
    );
}
export const SECTION_IDS = ["goal", "about", "shop", "supporters"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

const hexOrNull = z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable();

const DEFAULT_PLACEMENT = { x: 50, y: 50, zoom: 1 };
const placement = z.object({
  x: z.number().min(0).max(100).catch(50),
  y: z.number().min(0).max(100).catch(50),
  zoom: z.number().min(1).max(3).catch(1),
});
const DEFAULT_HEADER = {
  banner: "short",
  bannerHeight: 220,
  avatar: "square",
  avatarSize: "m",
  avatarBorder: true,
  overlap: true,
  align: "left",
} as const;

export const PageConfigSchema = z.object({
  theme: z.enum(THEME_IDS as [ThemeId, ...ThemeId[]]).catch("pigeon"),
  background: z.enum(BACKGROUNDS).catch("dots"),
  backgroundImagePath: z.string().max(300).nullable().catch(null),
  /** Optional override of the frame/border colour; null = theme ink. */
  frameColor: hexOrNull.catch(null),
  tipTitle: z.string().max(60).catch(""),
  tipNote: z.string().max(300).catch(""),
  buttonLabel: z.string().max(30).catch(""),
  thanksMessage: z.string().max(300).catch(""),
  sections: z
    .array(z.object({ id: z.enum(SECTION_IDS), visible: z.boolean() }))
    .catch([])
    .transform(normalizeSections),
  /** What phones see first. */
  focus: z.enum(["tip", "shop"]).catch("tip"),
  wall: z
    .object({
      showAmounts: z.boolean().catch(true),
      recentCount: z.number().int().min(0).max(20).catch(8),
      topCount: z.number().int().min(0).max(10).catch(5),
      topPeriod: z.enum(["30d", "all"]).catch("30d"),
    })
    .catch({ showAmounts: true, recentCount: 8, topCount: 5, topPeriod: "30d" }),
  /** Gift units, Trakteer/Buy-Me-a-Coffee style: "3 × corn" instead of a baht amount. */
  unit: z
    .object({
      enabled: z.boolean().catch(false),
      name: z.string().min(1).max(20).catch("ข้าวโพด"),
      price: z.number().min(1).max(10000).catch(20),
      icon: z.enum(ICON_IDS as [IconId, ...IconId[]]).catch("corn"),
      /** The streamer's own picture or GIF in public media; replaces the pixel icon. */
      iconPath: z.string().max(300).regex(/^[\w\-./]+$/).nullable().catch(null),
      presets: z.array(z.number().int().min(1).max(999)).min(1).max(5).catch([1, 3, 5, 10]),
    })
    .catch({ enabled: false, name: "ข้าวโพด", price: 20, icon: "corn", iconPath: null, presets: [1, 3, 5, 10] }),
  /** A pet shown next to the avatar. */
  petId: z.uuid().nullable().catch(null),
  /** Page fonts (FontChoice strings); "default" = the theme's. */
  fonts: z
    .object({
      heading: z.unknown().transform((v) => cleanFontChoice(v, "default")),
      body: z.unknown().transform((v) => cleanFontChoice(v, "default")),
    })
    .catch({ heading: "default", body: "default" }),
  /** The streamer's own font file in public media, used wherever "brand" is picked. */
  brandFontPath: z.string().max(300).regex(/^[\w\-./]+$/).nullable().catch(null),
  /** Own colours on top of the theme; null keeps the theme's. */
  colors: z
    .object({
      paper: hexOrNull.catch(null),
      card: hexOrNull.catch(null),
      text: hexOrNull.catch(null),
      muted: hexOrNull.catch(null),
      field: hexOrNull.catch(null),
    })
    .catch({ paper: null, card: null, text: null, muted: null, field: null }),
  /** How the background picture sits. */
  bgImage: z
    .object({
      x: z.number().min(0).max(100).catch(50),
      y: z.number().min(0).max(100).catch(50),
      size: z.enum(["cover", "contain", "tile"]).catch("cover"),
      /** Darken it, 0..80 %, so text stays readable. */
      dim: z.number().min(0).max(80).catch(0),
      fixed: z.boolean().catch(true),
    })
    .catch({ x: 50, y: 50, size: "cover", dim: 0, fixed: true }),
  /** Corners of boxes, buttons and fields. */
  shape: z.enum(["pixel", "rounded", "square"]).catch("pixel"),
  radius: z.number().int().min(0).max(32).catch(14),
  /** Tip box on the left or right on wide screens, or one column everywhere. */
  layout: z.enum(["split", "split-right", "single"]).catch("split"),
  width: z.enum(["narrow", "normal", "wide"]).catch("normal"),
  header: z
    .object({
      banner: z.enum(["none", "short", "tall", "custom"]).catch("short"),
      /** Cover height in px when `banner` is "custom". */
      bannerHeight: z.number().int().min(80).max(480).catch(220),
      avatar: z.enum(["square", "rounded", "round", "hidden"]).catch("square"),
      avatarSize: z.enum(["s", "m", "l", "xl"]).catch("m"),
      /** Frame around the profile picture. */
      avatarBorder: z.boolean().catch(true),
      /** Profile picture sits half over the cover, or fully below it. */
      overlap: z.boolean().catch(true),
      align: z.enum(["left", "center"]).catch("left"),
    })
    .catch(DEFAULT_HEADER),
  /** Where the cover picture sits in its frame (percent) and how far it is zoomed in. */
  bannerImage: placement.extend({ dim: z.number().min(0).max(80).catch(0) }).catch({ ...DEFAULT_PLACEMENT, dim: 0 }),
  avatarImage: placement.catch(DEFAULT_PLACEMENT),
  textScale: z.number().min(0.9).max(1.25).catch(1),
  /** The streamer's own CSS, scoped to the page. */
  css: z.string().max(MAX_PAGE_CSS).catch("").transform(safePageCss),
});

export type PageConfig = z.infer<typeof PageConfigSchema>;

function normalizeSections(list: Array<{ id: SectionId; visible: boolean }>) {
  const seen = new Set<SectionId>();
  const out: Array<{ id: SectionId; visible: boolean }> = [];
  for (const s of list) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    out.push(s);
  }
  for (const id of SECTION_IDS) if (!seen.has(id)) out.push({ id, visible: true });
  return out;
}

export function parsePageConfig(raw: unknown): PageConfig {
  const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return PageConfigSchema.parse(obj);
}

export const DEFAULT_PAGE_CONFIG: PageConfig = parsePageConfig({});

/** CSS custom properties that re-skin everything inside the storefront wrapper. */
export function themeVars(cfg: PageConfig, accent: string): Record<string, string | undefined> {
  const t = THEMES[cfg.theme];
  const c = cfg.colors;
  const heading = fontFamilyName(cfg.fonts.heading);
  const body = fontFamilyName(cfg.fonts.body);
  return {
    "--paper": c.paper ?? t.paper,
    "--paper-2": c.card ?? t.paper2,
    "--paper-3": t.paper3,
    "--ink": cfg.frameColor ?? c.text ?? t.ink,
    "--ink-soft": c.muted ?? t.inkSoft,
    "--ink-faint": c.muted ?? t.inkFaint,
    "--field": c.field ?? t.field,
    "--accent": accent,
    "--page-radius": `${cfg.radius}px`,
    color: c.text ?? t.ink,
    fontSize: cfg.textScale === 1 ? undefined : `${cfg.textScale * 100}%`,
    // The composite stacks (--font-title, --font-display, --font-sans) are resolved once at :root, so
    // they're overridden here as well as the faces they're built from. Text inherits an
    // already-resolved family, hence the explicit fontFamily for the body face.
    // Thai falls through to Moom's Thai faces when the picked font has none.
    ...(heading
      ? {
          "--font-pixel": heading,
          "--font-title": `${heading}, var(--font-thai-display), sans-serif`,
          "--font-display": `${heading}, var(--font-thai-display), sans-serif`,
        }
      : {}),
    ...(body
      ? {
          "--font-thai-body": body,
          "--font-sans": `${body}, system-ui, sans-serif`,
          fontFamily: `${body}, var(--font-thai-display), system-ui, sans-serif`,
        }
      : {}),
  };
}

export function backgroundStyle(cfg: PageConfig, imageUrl: string | null): React.CSSProperties {
  const t = { ...THEMES[cfg.theme], paper: cfg.colors.paper ?? THEMES[cfg.theme].paper, paper2: cfg.colors.card ?? THEMES[cfg.theme].paper2 };
  const dot = `color-mix(in srgb, ${t.ink} 10%, transparent)`;
  switch (cfg.background) {
    case "plain":
      return { backgroundColor: t.paper };
    case "grid":
      return {
        backgroundColor: t.paper,
        backgroundImage: `linear-gradient(${dot} 1px, transparent 1px), linear-gradient(90deg, ${dot} 1px, transparent 1px)`,
        backgroundSize: "16px 16px",
      };
    case "checker":
      return {
        backgroundColor: t.paper,
        backgroundImage: `linear-gradient(45deg, ${t.paper2} 25%, transparent 25%, transparent 75%, ${t.paper2} 75%), linear-gradient(45deg, ${t.paper2} 25%, transparent 25%, transparent 75%, ${t.paper2} 75%)`,
        backgroundSize: "24px 24px",
        backgroundPosition: "0 0, 12px 12px",
      };
    case "image":
      if (!imageUrl) return { backgroundColor: t.paper };
      {
        const b = cfg.bgImage;
        // Darkening is a flat layer over the picture, not a decorative gradient.
        const dim = b.dim ? `linear-gradient(rgba(0,0,0,${b.dim / 100}), rgba(0,0,0,${b.dim / 100})), ` : "";
        return {
          backgroundColor: t.paper,
          backgroundImage: `${dim}url(${imageUrl})`,
          backgroundSize: b.size === "tile" ? "auto" : b.size,
          backgroundRepeat: b.size === "tile" ? "repeat" : "no-repeat",
          backgroundAttachment: b.fixed ? "fixed" : "scroll",
          backgroundPosition: `${b.x}% ${b.y}%`,
        };
      }
    default:
      return {
        backgroundColor: t.paper,
        backgroundImage: `radial-gradient(${dot} 1px, transparent 1px)`,
        backgroundSize: "12px 12px",
      };
  }
}
