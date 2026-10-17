import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import type { Locale } from "@moom/shared/i18n";
import { I18nProvider, useT } from "@moom/shared/i18n/react";
import { PRESETS } from "@moom/shared/pets/sprites";
import { PixelSprite } from "@moom/shared/ui/PixelSprite";
import { Live } from "./Live";
import { SignIn } from "./SignIn";
import { configured, supabase } from "./session";

const LOCALE_KEY = "moom.desktop.locale";

function initialLocale(): Locale {
  try {
    const l = localStorage.getItem(LOCALE_KEY);
    if (l === "th" || l === "en") return l;
  } catch {
    /* ignore */
  }
  return navigator.language.toLowerCase().startsWith("th") ? "th" : "en";
}

export function App() {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const changeLocale = (l: Locale) => {
    setLocale(l);
    try {
      localStorage.setItem(LOCALE_KEY, l);
    } catch {
      /* ignore */
    }
  };
  return (
    <I18nProvider locale={locale}>
      <div className="flex min-h-dvh flex-col">
        <TitleBar locale={locale} onLocale={changeLocale} />
        <Gate />
      </div>
    </I18nProvider>
  );
}

function TitleBar({ locale, onLocale }: { locale: Locale; onLocale: (l: Locale) => void }) {
  return (
    <header className="flex items-center justify-between border-b-[3px] border-ink bg-paper-2 px-4 py-2">
      <div className="flex items-center gap-2">
        <PixelSprite sprite={PRESETS.bird} size={28} />
        <span className="font-display text-xl">moom</span>
      </div>
      <div className="flex items-center gap-1 font-display text-sm" role="group" aria-label="Language">
        {(["th", "en"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => onLocale(l)}
            aria-pressed={locale === l}
            className={`px-1.5 py-0.5 ${locale === l ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </header>
  );
}

function Gate() {
  const { d } = useT();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!configured) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!configured) {
    return <p className="m-6 bg-tomato p-3 text-paper">{d.desktop.notConfigured}</p>;
  }
  if (session === undefined) return <p className="m-6 text-ink-faint">{d.common.loading}</p>;
  if (!session) return <SignIn />;
  // Keyed by user so signing in as someone else starts a fresh engine.
  return <Live key={session.user.id} userId={session.user.id} />;
}
