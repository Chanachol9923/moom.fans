import { requireStreamer } from "@/lib/auth";
import { getPrivate } from "@/lib/domain/streamer";
import { getT } from "@/lib/i18n/server";
import { isSlipOkConfigured } from "@/lib/slipok";
import { AccountPanel } from "./AccountPanel";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const { profile } = await requireStreamer();
  const { d } = await getT();
  const priv = await getPrivate(profile.id);
  return (
    <div className="grid gap-5">
      <h1 className="text-3xl">{d.settings.title}</h1>
      <SettingsForm
        locale={profile.locale}
        promptpay={priv.promptpay_id}
        verifyMode={priv.verify_mode}
        slipokAvailable={isSlipOkConfigured()}
      />
      <AccountPanel slug={profile.slug} />
    </div>
  );
}
