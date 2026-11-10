"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Button, Field, Input, Panel, Select } from "@moom/shared/ui/kit";
import { useT } from "@moom/shared/i18n/react";
import { saveSettings, type SaveResult } from "../actions";
import { errorText, guardForm } from "@/lib/errors";

const save = guardForm(saveSettings, () => ({ ok: false, error: "network" }));

export function SettingsForm({
  locale,
  promptpay,
  verifyMode,
  slipokAvailable,
}: {
  locale: string;
  promptpay: string;
  verifyMode: "manual" | "slipok";
  slipokAvailable: boolean;
}) {
  const { d } = useT();
  const [state, action, pending] = useActionState<SaveResult, FormData>(save, { ok: false });

  return (
    <form action={action} className="grid gap-5">
      <div className="px-frame flex flex-wrap items-center gap-3 bg-paper-2 p-4">
        <p className="min-w-0 flex-1">{d.settings.profileMoved}</p>
        <Link href="/dashboard/page" className="px-btn px-btn-sm px-btn-primary">
          {d.settings.openPageDesign} →
        </Link>
      </div>

      <Panel title={d.settings.payout}>
        <Field label={d.onboarding.promptpay} hint={d.onboarding.promptpayHint} htmlFor="promptpay">
          <Input id="promptpay" name="promptpay" required inputMode="numeric" defaultValue={promptpay} autoComplete="off" className="max-w-sm" />
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

      <Panel title={d.settings.language}>
        <Field label={d.settings.pageLocale} htmlFor="locale">
          <Select id="locale" name="locale" defaultValue={locale} className="max-w-xs">
            <option value="th">ไทย</option>
            <option value="en">English</option>
          </Select>
        </Field>
      </Panel>

      <div className="sticky bottom-[68px] z-10 -mx-2 flex flex-wrap items-center gap-3 border-t-[3px] border-dashed border-ink/20 bg-paper px-2 py-2 md:bottom-0">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? d.common.loading : d.common.save}
        </Button>
        {state.ok && !pending && <span className="font-display text-leaf">✓ {d.common.saved}</span>}
        {state.error && (
          <span className="text-tomato">
            {state.error === "promptpay" ? d.onboarding.promptpayInvalid : errorText(state.error, d)}
          </span>
        )}
      </div>
    </form>
  );
}
