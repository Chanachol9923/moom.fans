import "server-only";
import { cache } from "react";
import { activeGoal, activePoll, wallData, type GoalView, type PollView, type SupporterView, type TopView } from "@/lib/domain/wall";
import type { Locale } from "@/lib/i18n";
import { parsePageConfig, type PageConfig } from "@/lib/page-config";
import { resolveSprite, type PetSprite } from "@/lib/pets/sprites";
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

export type Store = {
  slug: string;
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
      .select("media_enabled, media_baht_per_second, media_max_seconds")
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
  };
});
