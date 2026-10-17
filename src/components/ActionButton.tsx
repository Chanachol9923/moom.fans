"use client";
import { useTransition, type ReactNode } from "react";
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
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          await action();
          done?.();
        });
      }}
    >
      {pending ? "…" : children}
    </Button>
  );
}
