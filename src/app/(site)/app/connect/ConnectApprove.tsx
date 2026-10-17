"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { CopyField } from "@moom/shared/ui/CopyField";
import { Button, buttonClass } from "@moom/shared/ui/kit";
import { useT } from "@moom/shared/i18n/react";
import { approveAppLink } from "./actions";

export function ConnectApprove({ state, challenge, device }: { state: string; challenge: string; device: string }) {
  const { d } = useT();
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  if (code) {
    return (
      <div className="mt-5">
        <p className="font-display text-leaf">✓ {d.appLink.done}</p>
        <p className="mt-3 text-sm text-ink-soft">{d.appLink.fallback}</p>
        <div className="mt-1">
          <CopyField value={code} />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <Button
        variant="primary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await approveAppLink(challenge, device);
            if ("error" in r) return setError(true);
            setCode(r.code);
            // Hand the code to the app. The browser asks "Open Moom?" the first time.
            window.location.href = `moom://auth?${new URLSearchParams({ code: r.code, state }).toString()}`;
          })
        }
      >
        {pending ? d.appLink.opening : d.appLink.approve}
      </Button>
      <Link href="/dashboard" className={buttonClass("ghost")}>
        {d.appLink.deny}
      </Link>
      {error && <p className="w-full text-tomato">{d.common.error}</p>}
    </div>
  );
}
