"use client";
import { useState } from "react";
import { useT } from "@moom/shared/i18n/react";
import { Button } from "./kit";

export function CopyField({ value, secret = false }: { value: string; secret?: boolean }) {
  const { d } = useT();
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(!secret);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="px-input flex-1 truncate font-mono text-sm" title={shown ? value : undefined}>
        {shown ? value : value.replace(/[^/]{6}$/, "••••••").replace(/(overlay|control)\/[^/]+/, "$1/••••••••")}
      </code>
      {secret && (
        <Button type="button" size="sm" variant="ghost" onClick={() => setShown((s) => !s)}>
          {shown ? d.common.hide : d.common.show}
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? d.common.copied : d.common.copy}
      </Button>
    </div>
  );
}
