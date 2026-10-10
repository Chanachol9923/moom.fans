import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export async function SiteFooter() {
  const { d } = await getT();
  return (
    <footer className="border-t-[3px] border-dashed border-ink/30">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm text-ink-soft">
        <span>{d.landing.footer}</span>
        <nav className="flex gap-4 font-display">
          <Link href="/help" className="hover:text-ink">
            {d.landing.linkHelp}
          </Link>
          <Link href="/terms" className="hover:text-ink">
            {d.landing.linkTerms}
          </Link>
          <Link href="/privacy" className="hover:text-ink">
            {d.landing.linkPrivacy}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
