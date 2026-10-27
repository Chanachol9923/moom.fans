import { Panel } from "@moom/shared/ui/kit";
import { requireStreamer } from "@/lib/auth";
import { overlayUrl, getPrivate } from "@/lib/domain/streamer";
import { publicEnv } from "@/lib/env";
import { getT } from "@/lib/i18n/server";
import { publicMediaUrl } from "@/lib/storage";
import { parseGifs, parseStoredTiers } from "@moom/shared/overlay/design";
import { parsePageConfig } from "@/lib/page-config";
import { PreviewFrame } from "../overlay/PreviewFrame";
import { AlertDesignEditor } from "./AlertDesignEditor";
import { GifManager } from "./GifManager";

export default async function AlertsPage() {
  const { supabase, profile, user } = await requireStreamer();
  const { d } = await getT();
  const [priv, { data: settings }] = await Promise.all([
    getPrivate(profile.id),
    // "*" so the page still opens if the alert-design migration hasn't run yet.
    supabase.from("overlay_settings").select("*").eq("streamer_id", profile.id).single(),
  ]);
  if (!settings) throw new Error("overlay settings missing");
  const tiers = parseStoredTiers(settings.alert_tiers, `${profile.id}/`);
  const gifs = parseGifs(settings.alert_gifs, `${profile.id}/`);
  const brandPath = parsePageConfig(profile.page).brandFontPath;
  const brandFontUrl = brandPath?.startsWith(`${profile.id}/`) ? publicMediaUrl(brandPath) : null;
  // URLs for the files already chosen, so the editor can show them.
  const urls: Record<string, string> = {};
  for (const t of tiers) {
    for (const p of [t.media_path, t.sound_path]) {
      const u = p && publicMediaUrl(p);
      if (p && u) urls[p] = u;
    }
  }
  for (const g of gifs) {
    const u = publicMediaUrl(g.path);
    if (u) urls[g.path] = u;
  }

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-3xl">{d.design.title}</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">{d.design.intro}</p>
      </div>
      <Panel title={d.design.livePreview}>
        <PreviewFrame src={`${overlayUrl(priv.overlay_token)}?preview=1`} />
        <p className="mt-2 text-sm text-ink-faint">{d.design.livePreviewHint}</p>
      </Panel>
      <AlertDesignEditor
        initialTiers={tiers}
        initialCss={settings.custom_css ?? ""}
        urls={urls}
        defaultStyle={settings.alert_style}
        accent={profile.accent_color}
        locale={profile.locale}
        userId={user.id}
        supabase={{ url: publicEnv.supabaseUrl(), key: publicEnv.supabaseKey() }}
        brandFontUrl={brandFontUrl}
      />
      <GifManager
        initialGifs={gifs}
        initialMin={Number(settings.gif_min_amount ?? 0)}
        urls={urls}
        userId={user.id}
        supabase={{ url: publicEnv.supabaseUrl(), key: publicEnv.supabaseKey() }}
      />
    </div>
  );
}
