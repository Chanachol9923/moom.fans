"use client";
import { useState, useTransition } from "react";
import { Button, Field, Input, Panel, buttonClass } from "@/components/ui";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { deleteAccount } from "../more-actions";

export function AccountPanel({ slug }: { slug: string }) {
  const { d } = useT();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Panel title={d.settings.account}>
      <a href="/api/me/export" className={buttonClass("default", "sm")}>
        ↓ {d.settings.export}
      </a>
      <p className="mt-1 text-sm text-ink-faint">{d.settings.exportHint}</p>

      <div className="mt-6 border-t-[3px] border-dashed border-tomato/40 pt-4">
        <h3 className="text-base text-tomato">{d.settings.deleteAccount}</h3>
        <p className="mb-2 text-sm text-ink-soft">{d.settings.deleteHint}</p>
        <Field label={fmt(d.settings.deleteConfirm, { slug })} htmlFor="del-confirm">
          <Input id="del-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" className="max-w-xs" />
        </Field>
        <Button
          variant="danger"
          size="sm"
          disabled={pending || confirm.trim().toLowerCase() !== slug}
          onClick={() =>
            start(async () => {
              // On success the action redirects away; it only returns on failure.
              const r = await deleteAccount(confirm);
              if (!r.ok) setError(true);
            })
          }
        >
          {pending ? "…" : d.settings.deleteButton}
        </Button>
        {error && <p className="mt-2 text-tomato">{d.common.error}</p>}
      </div>
    </Panel>
  );
}
