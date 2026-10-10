import { requireStreamer } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { getT } from "@/lib/i18n/server";
import { parsePageConfig } from "@/lib/page-config";
import { resolveSprite } from "@/lib/pets/sprites";
import { loadStore } from "../../s/[slug]/data";
import { PageDesigner } from "./PageDesigner";

export default async function PageDesignPage() {
  const { supabase, profile, user } = await requireStreamer();
  const { d, locale } = await getT();
  const [store, { data: pets }] = await Promise.all([
    loadStore(profile.slug, locale),
    supabase.from("pets").select("id, name, species, palette, sprite").order("created_at"),
  ]);
  if (!store) throw new Error("store missing");
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-3xl">{d.page.title}</h1>
        <p className="mt-1 text-ink-soft">{d.page.subtitle}</p>
      </div>
      <PageDesigner
        store={store}
        initial={parsePageConfig(profile.page)}
        pets={(pets ?? []).map((p) => ({ id: p.id, name: p.name, sprite: resolveSprite(p.species, p.palette, p.sprite) }))}
        userId={user.id}
        supabase={{ url: publicEnv.supabaseUrl(), key: publicEnv.supabaseKey() }}
      />
    </div>
  );
}
