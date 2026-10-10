"use client";
import { useActionState } from "react";
import { Button, Check, Field, Input } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import { createGoal } from "../more-actions";

export function GoalForm() {
  const { d } = useT();
  const [state, action, pending] = useActionState(createGoal, { ok: false });
  return (
    <form action={action} key={state.ok ? "done" : "form"}>
      <div className="grid gap-x-5 sm:grid-cols-2">
        <Field label={d.goals.name} htmlFor="g-title">
          <Input id="g-title" name="title" required maxLength={80} />
        </Field>
        <Field label={d.goals.target} htmlFor="g-target">
          <Input id="g-target" name="target" type="number" min={1} step="1" required />
        </Field>
        <Field label={d.goals.starting} hint={d.goals.startingHint} htmlFor="g-start">
          <Input id="g-start" name="starting" type="number" min={0} step="1" defaultValue={0} />
        </Field>
        <Field label={`${d.goals.endsAt} (${d.common.optional})`} htmlFor="g-end">
          <Input id="g-end" name="endsAt" type="date" />
        </Field>
      </div>
      <Check name="includePurchases" label={d.goals.includePurchases} />
      <div className="mt-2 flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? d.common.loading : d.goals.new}
        </Button>
        {state.ok && <span className="font-display text-leaf">✓ {d.common.saved}</span>}
        {state.error && <span className="text-tomato">{d.common.error}</span>}
      </div>
    </form>
  );
}
