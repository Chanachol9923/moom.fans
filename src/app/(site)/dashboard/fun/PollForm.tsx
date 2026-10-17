"use client";
import { useActionState } from "react";
import { Button, Field, Input, Select, Textarea } from "@moom/shared/ui/kit";
import { useT } from "@moom/shared/i18n/react";
import { startPoll } from "../more-actions";

export function PollForm() {
  const { d } = useT();
  const [state, action, pending] = useActionState(startPoll, { ok: false });
  return (
    <form action={action} key={state.ok ? "done" : "form"} className="grid gap-x-5 sm:grid-cols-2">
      <div>
        <Field label={d.fun.pollTitle} htmlFor="poll-title">
          <Input id="poll-title" name="title" required maxLength={100} />
        </Field>
        <Field label={d.fun.pollWeight} htmlFor="poll-weight">
          <Select id="poll-weight" name="weightBy" defaultValue="amount">
            <option value="amount">{d.store.weightAmount}</option>
            <option value="count">{d.store.weightCount}</option>
          </Select>
        </Field>
      </div>
      <Field label={d.fun.pollOptions} htmlFor="poll-options">
        <Textarea id="poll-options" name="options" rows={5} required placeholder={"Minecraft\nValorant\nStardew"} />
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? d.common.loading : d.fun.pollStart}
        </Button>
        {state.error && <span className="text-tomato">{d.common.error}</span>}
      </div>
    </form>
  );
}
