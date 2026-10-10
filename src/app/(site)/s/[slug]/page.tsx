import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { getT } from "@/lib/i18n/server";
import { loadStore } from "./data";
import { StoreView } from "./StoreView";

export async function generateMetadata({ params }: PageProps<"/s/[slug]">): Promise<Metadata> {
  if (!isSupabaseConfigured()) return {};
  const { locale } = await getT();
  const store = await loadStore((await params).slug, locale);
  if (!store) return {};
  return {
    title: store.displayName,
    description: store.bio.slice(0, 160) || undefined,
    openGraph: store.avatarUrl ? { images: [store.avatarUrl] } : undefined,
  };
}

export default async function StorePage({ params }: PageProps<"/s/[slug]">) {
  if (!isSupabaseConfigured()) notFound();
  const { d, locale } = await getT();
  const store = await loadStore((await params).slug, locale);
  if (!store) notFound();
  return <StoreView store={store} d={d} locale={locale} />;
}
