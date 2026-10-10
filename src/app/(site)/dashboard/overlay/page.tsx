import { ActionButton } from "@/components/ActionButton";
import { CopyField } from "@/components/CopyField";
import { Panel } from "@/components/ui";
import { requireStreamer } from "@/lib/auth";
import { controlUrl, getPrivate, overlayUrl } from "@/lib/domain/streamer";
import { publicEnv } from "@/lib/env";
import { siteUrl } from "@/lib/hosts";
import { getT } from "@/lib/i18n/server";
import { publicMediaUrl } from "@/lib/storage";
import { rotateOverlayToken, sendControl, sendTestAlert } from "../actions";
import { OverlaySettingsForm } from "./OverlaySettingsForm";
import { AlertQueue } from "./AlertQueue";
import { PreviewFrame } from "./PreviewFrame";

export default async function OverlayPage() {
  const { supabase, profile, user } = await requireStreamer();
  const { d } = await getT();
  const [priv, { data: settings }] = await Promise.all([
    getPrivate(profile.id),
    supabase.from("overlay_settings").select("*").eq("streamer_id", profile.id).single(),
  ]);
  if (!settings) throw new Error("overlay settings missing");
  const url = overlayUrl(priv.overlay_token);

  return (
    <div className="grid gap-5">
      <h1 className="text-3xl">{d.overlay.title}</h1>

      <Panel title={d.overlay.urlLabel}>
        <CopyField value={url} secret />
        <p className="mt-2 text-sm text-ink-soft">{d.overlay.urlHint}</p>
        <p className="mt-1 text-sm text-ink-faint">{d.overlay.urlSecret}</p>
        <ActionButton size="sm" variant="ghost" className="mt-2" confirm={d.overlay.regenerateConfirm} action={rotateOverlayToken}>
          ↻ {d.overlay.regenerate}
        </ActionButton>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={d.overlay.controls}>
          <div className="flex flex-wrap gap-2">
            <ActionButton variant="danger" action={sendControl.bind(null, "panic")}>
              ■ {d.overlay.panic}
            </ActionButton>
            <ActionButton action={sendControl.bind(null, "resume")}>▶ {d.overlay.resume}</ActionButton>
            <ActionButton variant="ghost" action={sendControl.bind(null, "skip")}>
              ⏭ {d.overlay.skip}
            </ActionButton>
          </div>
          <p className="mt-2 text-sm text-ink-faint">{d.overlay.panicHint}</p>

          <h3 className="mt-5 mb-1 text-base">{d.overlay.test}</h3>
          <div className="flex flex-wrap gap-2">
            <ActionButton size="sm" variant="beak" action={sendTestAlert.bind(null, "tip")}>
              {d.overlay.testTip}
            </ActionButton>
            <ActionButton size="sm" variant="beak" action={sendTestAlert.bind(null, "purchase")}>
              {d.overlay.testPurchase}
            </ActionButton>
            <ActionButton size="sm" variant="beak" action={sendTestAlert.bind(null, "unit")}>
              {d.overlay.testUnit}
            </ActionButton>
            <ActionButton size="sm" variant="beak" action={sendTestAlert.bind(null, "wheel")}>
              {d.overlay.testWheel}
            </ActionButton>
            {settings.media_enabled && (
              <ActionButton size="sm" variant="beak" action={sendTestAlert.bind(null, "media")}>
                {d.overlay.testMedia}
              </ActionButton>
            )}
          </div>

          <details className="mt-5">
            <summary className="cursor-pointer font-display text-sm">{d.overlay.dock}</summary>
            <p className="my-2 text-sm text-ink-faint">{d.overlay.dockHint}</p>
            <CopyField value={siteUrl("/dock")} />
          </details>

          <details className="mt-3">
            <summary className="cursor-pointer font-display text-sm">{d.overlay.streamDeck}</summary>
            <p className="my-2 text-sm text-ink-faint">{d.overlay.streamDeckHint}</p>
            {(["panic", "resume", "skip"] as const).map((a) => (
              <div key={a} className="mb-2">
                <div className="px-label">{a}</div>
                <CopyField value={controlUrl(priv.control_token, a)} secret />
              </div>
            ))}
          </details>
        </Panel>

        <Panel title={d.overlay.preview}>
          <PreviewFrame src={`${url}?preview=1`} />
        </Panel>
      </div>

      <AlertQueue streamerId={profile.id} />

      <OverlaySettingsForm
        settings={settings}
        blockedWords={priv.blocked_words}
        userId={user.id}
        soundUrl={publicMediaUrl(settings.alert_sound_path)}
        supabase={{ url: publicEnv.supabaseUrl(), key: publicEnv.supabaseKey() }}
      />
    </div>
  );
}
