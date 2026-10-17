import type { VtsRule } from "@moom/shared/alerts";
import { requireStreamer } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { VtsManager } from "./VtsManager";

export default async function VtsPage() {
  const { supabase, profile } = await requireStreamer();
  const { d } = await getT();
  const { data: s } = await supabase
    .from("overlay_settings")
    .select("vts_enabled, vts_rules")
    .eq("streamer_id", profile.id)
    .single();
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-3xl">{d.vts.title}</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">{d.vts.subtitle}</p>
      </div>
      <VtsManager enabled={s?.vts_enabled ?? false} rules={(s?.vts_rules as unknown as VtsRule[]) ?? []} />
    </div>
  );
}
