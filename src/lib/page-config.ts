import { z } from "zod";
import { ICON_IDS, type IconId } from "@/lib/pets/icons";

// Storefront design, stored in profiles.page. Every field has a default and parsing
// never throws, so an old or hand-edited value can't break a public page.

export const THEMES = {
  pigeon: { paper: "#f2ead7", paper2: "#e6dbc2", paper3: "#d6c8a8", ink: "#241e19", inkSoft: "#5d5247", inkFaint: "#8c806f", field: "#fffaf0" },
  night: { paper: "#1f2230", paper2: "#2a2e3f", paper3: "#3a3f55", ink: "#f1ead8", inkSoft: "#c9c0ad", inkFaint: "#8e889a", field: "#14161f" },
  sakura: { paper: "#fbeef0", paper2: "#f4dbe0", paper3: "#e7c0c8", ink: "#3a2329", inkSoft: "#6e4b54", inkFaint: "#a07f87", field: "#fffafb" },
  matcha: { paper: "#eef2df", paper2: "#dfe6c7", paper3: "#c8d3a6", ink: "#22301c", inkSoft: "#4c5c40", inkFaint: "#7d8a6e", field: "#fbfdf4" },
  arcade: { paper: "#fff7d6", paper2: "#ffe9a3", paper3: "#f4d06f", ink: "#1b1a3a", inkSoft: "#46436e", inkFaint: "#7d7aa6", field: "#fffdf3" },
} as const;

export type ThemeId = keyof typeof THEMES;
export const THEME_IDS = Object.keys(THEMES) as ThemeId[];

export const BACKGROUNDS = ["dots", "grid", "checker", "plain", "image"] as const;
export const SECTION_IDS = ["goal", "about", "shop", "supporters"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

const hexOrNull = z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable();

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
      presets: z.array(z.number().int().min(1).max(999)).min(1).max(5).catch([1, 3, 5, 10]),
    })
    .catch({ enabled: false, name: "ข้าวโพด", price: 20, icon: "corn", presets: [1, 3, 5, 10] }),
  /** A pet shown next to the avatar. */
  petId: z.uuid().nullable().catch(null),
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
export function themeVars(cfg: PageConfig, accent: string): Record<string, string> {
  const t = THEMES[cfg.theme];
  return {
    "--paper": t.paper,
    "--paper-2": t.paper2,
    "--paper-3": t.paper3,
    "--ink": cfg.frameColor ?? t.ink,
    "--ink-soft": t.inkSoft,
    "--ink-faint": t.inkFaint,
    "--field": t.field,
    "--accent": accent,
    color: t.ink,
  };
}

export function backgroundStyle(cfg: PageConfig, imageUrl: string | null): React.CSSProperties {
  const t = THEMES[cfg.theme];
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
      return imageUrl
        ? {
            backgroundColor: t.paper,
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: "cover",
            backgroundAttachment: "fixed",
            backgroundPosition: "center",
          }
        : { backgroundColor: t.paper };
    default:
      return {
        backgroundColor: t.paper,
        backgroundImage: `radial-gradient(${dot} 1px, transparent 1px)`,
        backgroundSize: "12px 12px",
      };
  }
}
