"use client";
import { useActionState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { sendMagicLink, signInWithProvider, type LoginState } from "./actions";

export function LoginForm({ discord, google, devHint }: { discord: boolean; google: boolean; devHint: boolean }) {
  const { d } = useT();
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div>
        <p className="text-lg">{fmt(d.auth.linkSent, { email: state.email ?? "" })}</p>
        {devHint && <p className="mt-3 text-sm text-ink-faint">{d.auth.devMailHint}</p>}
      </div>
    );
  }

  return (
    <>
      <form action={action}>
        <Field label={d.auth.email} htmlFor="email" error={state.status === "error" ? d.auth.failed : undefined}>
          <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
        </Field>
        <Button type="submit" variant="primary" className="w-full" disabled={pending}>
          {pending ? d.common.loading : d.auth.sendLink}
        </Button>
      </form>

      {(discord || google) && (
        <>
          <div className="my-5 flex items-center gap-3 text-sm text-ink-faint">
            <span className="px-divider flex-1" /> {d.auth.or} <span className="px-divider flex-1" />
          </div>
          <form action={signInWithProvider} className="grid gap-2">
            {discord && (
              <Button type="submit" name="provider" value="discord" className="w-full">
                {d.auth.discord}
              </Button>
            )}
            {google && (
              <Button type="submit" name="provider" value="google" className="w-full">
                {d.auth.google}
              </Button>
            )}
          </form>
        </>
      )}
    </>
  );
}
