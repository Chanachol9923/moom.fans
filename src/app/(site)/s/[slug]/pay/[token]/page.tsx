import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { payView } from "@/lib/domain/pay-view";
import { getTransactionByToken } from "@/lib/domain/transactions";
import { isSupabaseConfigured } from "@/lib/env";
import { admin } from "@/lib/supabase/admin";
import { backgroundStyle, parsePageConfig, themeVars } from "@/lib/page-config";
import { PayClient } from "./PayClient";

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function PayPage({ params }: PageProps<"/s/[slug]/pay/[token]">) {
  if (!isSupabaseConfigured()) notFound();
  const { slug, token } = await params;
  const tx = await getTransactionByToken(token);
  if (!tx) notFound();
  const { data: profile } = await admin()
    .from("profiles")
    .select("id, slug, display_name, accent_color, page")
    .eq("id", tx.streamer_id)
    .single();
  if (!profile || profile.slug !== slug) notFound();

  const page = parsePageConfig(profile.page);
  return (
    <div style={{ ...themeVars(page, profile.accent_color), ...backgroundStyle(page, null) }} className="min-h-dvh">
      <PayClient token={token} initial={payView(tx)} streamerName={profile.display_name} thanks={page.thanksMessage} />
    </div>
  );
}
