"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Locale } from "@moom/shared/i18n";
import { setLocale } from "@/lib/i18n/actions";
import { useT } from "@moom/shared/i18n/react";

export function LocaleSwitch() {
  const { locale } = useT();
  const router = useRouter();
  const [, start] = useTransition();
  const set = (l: Locale) =>
    start(async () => {
      await setLocale(l);
      router.refresh();
    });
  return (
    <div className="flex items-center gap-1 font-display text-sm" role="group" aria-label="Language">
      {(["th", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => set(l)}
          aria-pressed={locale === l}
          className={`px-1.5 py-0.5 ${locale === l ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
