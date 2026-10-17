"use client";
import { useActionState, useState } from "react";
import { Button, Field, Input } from "@moom/shared/ui/kit";
import { useT } from "@moom/shared/i18n/react";
import { createCorner, type OnboardingState } from "./actions";

export function OnboardingForm({ rootDomain }: { rootDomain: string }) {
  const { d } = useT();
  const [state, action, pending] = useActionState<OnboardingState, FormData>(createCorner, {});
  const [slug, setSlug] = useState(state.values?.slug ?? "");
  const e = state.errors ?? {};

  return (
    <form action={action}>
      <Field
        label={d.onboarding.slug}
        htmlFor="slug"
        hint={d.onboarding.slugHint}
        error={e.slug === "taken" ? d.onboarding.slugTaken : e.slug ? d.onboarding.slugInvalid : undefined}
      >
        <div className="flex items-center gap-2">
          <Input
            id="slug"
            name="slug"
            required
            minLength={3}
            maxLength={30}
            pattern="[a-z0-9\-]+"
            value={slug}
            onChange={(ev) => setSlug(ev.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            autoComplete="off"
            spellCheck={false}
          />
          <span className="shrink-0 font-display text-ink-soft">.{rootDomain}</span>
        </div>
      </Field>
      <Field label={d.onboarding.displayName} htmlFor="displayName" error={e.displayName && d.common.error}>
        <Input id="displayName" name="displayName" required maxLength={60} defaultValue={state.values?.displayName} />
      </Field>
      <Field
        label={d.onboarding.promptpay}
        htmlFor="promptpay"
        hint={d.onboarding.promptpayHint}
        error={e.promptpay && d.onboarding.promptpayInvalid}
      >
        <Input
          id="promptpay"
          name="promptpay"
          required
          inputMode="numeric"
          autoComplete="off"
          defaultValue={state.values?.promptpay}
          placeholder="08x-xxx-xxxx"
        />
      </Field>
      {e.form && <p className="mb-3 text-tomato">{d.common.error}</p>}
      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        {pending ? d.common.loading : d.onboarding.submit}
      </Button>
    </form>
  );
}
