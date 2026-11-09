"use client";
import { useState, useTransition, type ReactNode } from "react";
import { useT } from "@moom/shared/i18n/react";
import { isNextControl } from "@/lib/errors";
import { Button } from "@moom/shared/ui/kit";

/** Button that runs a server action and disables itself while it runs. */
export function ActionButton({
  action,
  children,
  variant,
  size,
  confirm,
  className,
  done,
}: {
  action: () => Promise<unknown>;
  children: ReactNode;
  variant?: "default" | "primary" | "beak" | "danger" | "ghost";
  size?: "md" | "sm";
  confirm?: string;
  className?: string;
  done?: () => void;
}) {
  const { d } = useT();
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  return (
    <Button
      type="button"
      variant={failed ? "danger" : variant}
      size={size}
      className={className}
      disabled={pending}
      title={failed ? d.common.errNetwork : undefined}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        setFailed(false);
        start(async () => {
          try {
            await action();
            done?.();
          } catch (e) {
            // Approving a slip on a shaky phone connection: say so on the button and let
            // them press again, instead of dropping the whole page into the error screen.
            if (isNextControl(e)) throw e;
            setFailed(true);
          }
        });
      }}
    >
      {pending ? "…" : failed ? `↻ ${d.common.retryPress}` : children}
    </Button>
  );
}
