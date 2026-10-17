import Link from "next/link";
import { Panel } from "@/components/ui";
import { requireStreamer } from "@/lib/auth";
import { fmt } from "@moom/shared/i18n";
import { getT } from "@/lib/i18n/server";
import { MAX_PETS, resolveSprite } from "@moom/shared/pets/sprites";
import { PetsManager } from "./PetsManager";

export default async function PetsPage() {
  const { supabase, profile } = await requireStreamer();
  const { d } = await getT();
  const [{ data: pets }, { data: settings }] = await Promise.all([
    supabase.from("pets").select("*").order("created_at"),
    supabase.from("overlay_settings").select("pets_enabled, twitch_channel").eq("streamer_id", profile.id).single(),
  ]);
  const list = (pets ?? []).map((p) => ({ ...p, resolved: resolveSprite(p.species, p.palette, p.sprite) }));

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-3xl">{d.pets.title}</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">{d.pets.subtitle}</p>
        <p className="mt-1 text-sm text-ink-faint">{fmt(d.pets.limit, { max: MAX_PETS })}</p>
      </div>
      {!settings?.pets_enabled && (
        <Panel className="bg-beak/30">
          <Link href="/dashboard/overlay" className="underline">
            {d.pets.disabledHint}
          </Link>
        </Panel>
      )}
      <PetsManager pets={list} />
    </div>
  );
}
