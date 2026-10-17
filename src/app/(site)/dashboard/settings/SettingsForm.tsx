"use client";
import { useActionState, useState } from "react";
import { Button, Field, Input, Panel, Select, Textarea } from "@/components/ui";
import { useT } from "@moom/shared/i18n/react";
import type { ProfileRow } from "@/lib/supabase/database.types";
import { uploadPublicMedia, type SupabasePublic } from "@/lib/upload-client";
import { saveProfile, type SaveResult } from "../actions";

export function SettingsForm({
  profile: p,
  links,
  promptpay,
  verifyMode,
  slipokAvailable,
  avatarUrl,
  bannerUrl,
  userId,
  supabase,
}: {
  profile: ProfileRow;
  links: string;
  promptpay: string;
  verifyMode: "manual" | "slipok";
  slipokAvailable: boolean;
  avatarUrl: string | null;
  bannerUrl: string | null;
  userId: string;
  supabase: SupabasePublic;
}) {
  const { d } = useT();
  const [state, action, pending] = useActionState<SaveResult, FormData>(saveProfile, { ok: false });
  const [avatar, setAvatar] = useState({ path: p.avatar_path ?? "", url: avatarUrl });
  const [banner, setBanner] = useState({ path: p.banner_path ?? "", url: bannerUrl });
  const [accent, setAccent] = useState(p.accent_color);

  const pick = (kind: "avatar" | "banner") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const path = await uploadPublicMedia(supabase, userId, f, kind);
    const url = URL.createObjectURL(f);
    (kind === "avatar" ? setAvatar : setBanner)({ path, url });
  };

  return (
    <form action={action} className="grid gap-5">
      <Panel title={d.settings.profile}>
        <input type="hidden" name="avatar_path" value={avatar.path} />
        <input type="hidden" name="banner_path" value={banner.path} />
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <label className="cursor-pointer text-center">
            <div className="px-frame size-24 overflow-hidden bg-paper-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview / CDN */}
              {avatar.url && <img src={avatar.url} alt="" className="size-full object-cover" />}
            </div>
            <span className="px-label mt-1">{d.settings.avatar}</span>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={pick("avatar")} />
          </label>
          <label className="min-w-48 flex-1 cursor-pointer">
            <div
              className="px-frame h-24 bg-paper-2 bg-cover bg-center"
              style={banner.url ? { backgroundImage: `url(${banner.url})` } : { background: accent }}
            />
            <span className="px-label mt-1">{d.settings.banner}</span>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={pick("banner")} />
          </label>
        </div>

        <div className="grid gap-x-5 sm:grid-cols-[1fr_160px]">
          <Field label={d.onboarding.displayName} htmlFor="display_name">
            <Input id="display_name" name="display_name" required maxLength={60} defaultValue={p.display_name} />
          </Field>
          <Field label={d.settings.accent} htmlFor="accent_color">
            <input
              id="accent_color"
              name="accent_color"
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              className="h-10 w-full cursor-pointer"
            />
          </Field>
        </div>
        <Field label={d.settings.bio} htmlFor="bio">
          <Textarea id="bio" name="bio" maxLength={500} rows={3} defaultValue={p.bio} />
        </Field>
        <Field label={d.settings.links} hint={d.settings.linksHint} htmlFor="links">
          <Textarea id="links" name="links" rows={3} defaultValue={links} />
        </Field>
        <div className="grid gap-x-5 sm:grid-cols-3">
          <Field label={d.settings.tipPresets} hint={d.settings.tipPresetsHint} htmlFor="tip_presets">
            <Input id="tip_presets" name="tip_presets" defaultValue={p.tip_presets.join(", ")} />
          </Field>
          <Field label={d.settings.minTip} htmlFor="min_tip">
            <Input id="min_tip" name="min_tip" type="number" min={1} defaultValue={p.min_tip} />
          </Field>
          <Field label={d.settings.pageLocale} htmlFor="locale">
            <Select id="locale" name="locale" defaultValue={p.locale}>
              <option value="th">ไทย</option>
              <option value="en">English</option>
            </Select>
          </Field>
        </div>
      </Panel>

      <Panel title={d.settings.payout}>
        <Field label={d.onboarding.promptpay} hint={d.onboarding.promptpayHint} htmlFor="promptpay">
          <Input id="promptpay" name="promptpay" required inputMode="numeric" defaultValue={promptpay} autoComplete="off" />
        </Field>
        <div className="px-label">{d.settings.verify}</div>
        <label className="my-2 flex cursor-pointer gap-2">
          <input type="radio" name="verify_mode" value="manual" defaultChecked={verifyMode === "manual"} />
          <span>
            <b className="font-display">{d.settings.verifyManual}</b>
            <span className="block text-sm text-ink-soft">{d.settings.verifyManualHint}</span>
          </span>
        </label>
        <label className={`my-2 flex gap-2 ${slipokAvailable ? "cursor-pointer" : "opacity-50"}`}>
          <input
            type="radio"
            name="verify_mode"
            value="slipok"
            disabled={!slipokAvailable}
            defaultChecked={verifyMode === "slipok"}
          />
          <span>
            <b className="font-display">{d.settings.verifySlipok}</b>
            <span className="block text-sm text-ink-soft">
              {slipokAvailable ? d.settings.verifySlipokHint : d.settings.verifySlipokOff}
            </span>
          </span>
        </label>
      </Panel>

      <div className="sticky bottom-3 flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? d.common.loading : d.common.save}
        </Button>
        {state.ok && !pending && <span className="font-display text-leaf">✓ {d.common.saved}</span>}
        {state.error && (
          <span className="text-tomato">
            {state.error === "promptpay" ? d.onboarding.promptpayInvalid : `${d.common.error} (${state.error})`}
          </span>
        )}
      </div>
    </form>
  );
}
