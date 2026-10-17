import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { buttonClass } from "@moom/shared/ui/kit";
import { requireStreamer } from "@/lib/auth";
import { creatorUrl } from "@/lib/hosts";
import { getT } from "@/lib/i18n/server";
import { signOut } from "../login/actions";
import { DashNav } from "./DashNav";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const { supabase, profile } = await requireStreamer();
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
      <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 pb-16 md:grid-cols-[200px_1fr]">
        <aside className="md:sticky md:top-4 md:self-start">
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
          <Link href={creatorUrl(profile.slug)} target="_blank" className={buttonClass("ghost", "sm", "mt-2 md:hidden")}>
            {d.nav.viewPage} ↗
          </Link>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
