import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { buttonClass } from "@moom/shared/ui/kit";
import { requireStreamer } from "@/lib/auth";
import { creatorUrl } from "@/lib/hosts";
import { getT } from "@/lib/i18n/server";
import { fmt } from "@moom/shared/i18n";
import { signOut } from "../login/actions";
import { DashNav } from "./DashNav";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const { supabase, profile, user } = await requireStreamer();
  const { d } = await getT();
  const [{ count: pendingTx }, { count: heldAlerts }] = await Promise.all([
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("alerts").select("id", { count: "exact", head: true }).eq("status", "held"),
  ]);

  return (
    <div style={{ ["--accent" as string]: profile.accent_color }}>
      <SiteHeader
        right={
          <form action={signOut}>
            <button className="font-display text-sm text-ink-soft hover:text-ink" type="submit">
              {d.auth.signOut}
            </button>
          </form>
        }
      />
      {/* pb-28 on phones keeps content clear of the bottom tab bar. */}
      <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 pb-28 md:grid-cols-[200px_1fr] md:pb-16">
        <aside className="min-w-0 md:sticky md:top-4 md:self-start">
          <div className="mb-3 hidden md:block">
            <div className="font-display text-lg leading-tight">{profile.display_name}</div>
            <Link
              href={creatorUrl(profile.slug)}
              target="_blank"
              className="text-sm text-teal underline decoration-dotted"
            >
              {d.nav.viewPage} ↗
            </Link>
          </div>
          <DashNav pending={(pendingTx ?? 0) + (heldAlerts ?? 0)} />
          <Link href={creatorUrl(profile.slug)} target="_blank" className={buttonClass("ghost", "sm", "md:hidden")}>
            {d.nav.viewPage} ↗
          </Link>
          {user.email && (
            <p className="mt-2 truncate text-xs text-ink-faint md:mt-4" title={user.email}>
              {fmt(d.auth.signedInAs, { email: user.email })}
            </p>
          )}
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
