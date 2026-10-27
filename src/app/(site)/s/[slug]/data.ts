import "server-only";
import { cache } from "react";
import { storeBasePath } from "@/lib/hosts";
import { activeGoal, activePoll, wallData, type GoalView, type PollView, type SupporterView, type TopView } from "@/lib/domain/wall";
import type { Locale } from "@moom/shared/i18n";
import { parsePageConfig, type PageConfig } from "@/lib/page-config";
import { resolveSprite, type PetSprite } from "@moom/shared/pets/sprites";
import { mediaKindOf, parseGifs } from "@moom/shared/overlay/design";
import { publicMediaUrl } from "@/lib/storage";
import { admin } from "@/lib/supabase/admin";

export type StoreProduct = {
  id: string;
  title: string;
  description: string;
  price: number;
  coverUrl: string | null;
  previewUrl: string | null;
};

export type StoreLink = { label: string; url: string };

/** A GIF the supporter can pick to show with their alert. */
export type StoreGif = { id: string; url: string; kind: "image" | "video"; label: string };

export type Store = {
  slug: string;
  /** "" on a subdomain, "/s/<slug>" when subdomains are off. Prefix for in-page links. */
  basePath: string;
  displayName: string;
  bio: string;
  accent: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  backgroundUrl: string | null;
  links: StoreLink[];
  tipPresets: number[];
  minTip: number;
  media: { bahtPerSecond: number; maxSeconds: number } | null;
  products: StoreProduct[];
  page: PageConfig;
  goal: GoalView | null;
  poll: PollView | null;
  recent: SupporterView[];
  top: TopView[];
  pet: PetSprite | null;
  gifs: StoreGif[];
  /** Smallest tip that may pick a GIF. */
  gifMin: number;
  brandFontUrl: string | null;
};

/** Everything the public storefront needs, and nothing private. */
export const loadStore = cache(async (slug: string, locale: Locale): Promise<Store | null> => {
  const db = admin();
  const { data: p } = await db.from("profiles").select("*").eq("slug", slug).maybeSingle();
  if (!p) return null;
  const page = parsePageConfig(p.page);
  const [{ data: s }, { data: products }, goal, poll, wall, pet] = await Promise.all([
    db
      .from("overlay_settings")
      .select("*")
      .eq("streamer_id", p.id)
      .maybeSingle(),
    db
      .from("products")
      .select("id, title, description, price, cover_path, preview_audio_path")
      .eq("streamer_id", p.id)
      .eq("is_published", true)
      .order("sort_order")
      .order("created_at"),
    activeGoal(p.id),
    activePoll(p.id),
    wallData(p.id, { ...page.wall, locale }),
    page.petId
      ? db.from("pets").select("species, palette, sprite").eq("id", page.petId).eq("streamer_id", p.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const links = Array.isArray(p.links)
    ? (p.links as unknown[]).filter(
        (l): l is StoreLink =>
          !!l && typeof l === "object" && typeof (l as StoreLink).url === "string" && typeof (l as StoreLink).label === "string",
      )
    : [];
  return {
    slug: p.slug,
    basePath: storeBasePath(p.slug),
    displayName: p.display_name,
    bio: p.bio,
    accent: p.accent_color,
    avatarUrl: publicMediaUrl(p.avatar_path),
    bannerUrl: publicMediaUrl(p.banner_path),
    backgroundUrl: publicMediaUrl(page.backgroundImagePath),
    links,
    tipPresets: p.tip_presets,
    minTip: Number(p.min_tip),
    media: s?.media_enabled ? { bahtPerSecond: Number(s.media_baht_per_second), maxSeconds: s.media_max_seconds } : null,
    products: (products ?? []).map(
      (x): StoreProduct => ({
        id: x.id,
        title: x.title,
        description: x.description,
        price: Number(x.price),
        coverUrl: publicMediaUrl(x.cover_path),
        previewUrl: publicMediaUrl(x.preview_audio_path),
      }),
    ),
    page,
    goal,
    poll,
    recent: wall.recent,
    top: wall.top,
    pet: pet.data ? resolveSprite(pet.data.species, pet.data.palette, pet.data.sprite) : null,
    gifs: parseGifs(s?.alert_gifs, `${p.id}/`).flatMap((g): StoreGif[] => {
      const url = publicMediaUrl(g.path);
      const kind = mediaKindOf(g.path);
      return url && kind ? [{ id: g.id, url, kind, label: g.label }] : [];
    }),
    gifMin: Number(s?.gif_min_amount ?? 0),
    brandFontUrl: page.brandFontPath?.startsWith(`${p.id}/`) ? publicMediaUrl(page.brandFontPath) : null,
  };
});
