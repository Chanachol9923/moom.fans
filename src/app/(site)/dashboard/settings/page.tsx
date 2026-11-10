import { requireStreamer } from "@/lib/auth";
import { getPrivate } from "@/lib/domain/streamer";
import { getT } from "@/lib/i18n/server";
import { maskPromptPayId } from "@/lib/promptpay";
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
        // Only the masked number goes to the browser, so it can't show up on stream.
        promptpayMasked={maskPromptPayId(priv.promptpay_type, priv.promptpay_id)}
        verifyMode={priv.verify_mode}
        slipokAvailable={isSlipOkConfigured()}
      />
      <AccountPanel slug={profile.slug} />
    </div>
  );
}
