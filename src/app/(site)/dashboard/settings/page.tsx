import { requireStreamer } from "@/lib/auth";
import { getPrivate } from "@/lib/domain/streamer";
import { publicEnv } from "@/lib/env";
import { getT } from "@/lib/i18n/server";
import { isSlipOkConfigured } from "@/lib/slipok";
import { publicMediaUrl } from "@/lib/storage";
import { AccountPanel } from "./AccountPanel";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const { profile, user } = await requireStreamer();
  const { d } = await getT();
  const priv = await getPrivate(profile.id);
  const links = Array.isArray(profile.links)
    ? (profile.links as Array<{ label?: string; url?: string }>)
        .filter((l) => l?.url)
        .map((l) => `${l.label ?? ""} | ${l.url}`)
        .join("\n")
    : "";
  return (
    <div className="grid gap-5">
      <h1 className="text-3xl">{d.settings.title}</h1>
      <SettingsForm
        profile={profile}
        links={links}
        promptpay={priv.promptpay_id}
        verifyMode={priv.verify_mode}
        slipokAvailable={isSlipOkConfigured()}
        avatarUrl={publicMediaUrl(profile.avatar_path)}
        bannerUrl={publicMediaUrl(profile.banner_path)}
        userId={user.id}
        supabase={{ url: publicEnv.supabaseUrl(), key: publicEnv.supabaseKey() }}
      />
      <AccountPanel slug={profile.slug} />
    </div>
  );
}
