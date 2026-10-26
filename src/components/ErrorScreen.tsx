"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useT } from "@moom/shared/i18n/react";
import { PRESETS } from "@moom/shared/pets/sprites";
import { Button, buttonClass } from "@moom/shared/ui/kit";
import { PixelSprite } from "@moom/shared/ui/PixelSprite";

/** What an error boundary shows on the site and dashboard: what happened, and a way out. */
export function ErrorScreen({ error, retry, inDashboard = false }: { error: Error & { digest?: string }; retry: () => void; inDashboard?: boolean }) {
  const { d } = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <main className="mx-auto grid min-h-[60dvh] max-w-md place-items-center px-4 text-center">
      <div>
        <PixelSprite sprite={PRESETS.slime} frame="sleep" size={96} />
        <h1 className="mt-4 text-3xl">{offline ? d.errorPage.offline : d.errorPage.title}</h1>
        <p className="mt-2 text-ink-soft">{d.errorPage.body}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="primary" onClick={retry}>
            ↻ {d.errorPage.retry}
          </Button>
          {inDashboard ? (
            <Link href="/login?next=/dashboard" className={buttonClass("ghost")}>
              {d.errorPage.signIn}
            </Link>
          ) : (
            <Link href="/" className={buttonClass("ghost")}>
              {d.errorPage.home}
            </Link>
          )}
        </div>
        {error.digest && <p className="mt-4 font-mono text-xs text-ink-faint">ref {error.digest}</p>}
      </div>
    </main>
  );
}
