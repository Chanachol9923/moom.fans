import "server-only";
import { siteUrl } from "@/lib/hosts";
import { admin } from "@/lib/supabase/admin";

export async function getPrivate(streamerId: string) {
  const { data } = await admin().from("streamer_private").select("*").eq("streamer_id", streamerId).single();
  if (!data) throw new Error("streamer_private missing");
  return data;
}

export function overlayUrl(token: string) {
  return siteUrl(`/overlay/${token}`);
}

export function controlUrl(token: string, action: "panic" | "skip" | "resume") {
  return siteUrl(`/api/control/${token}/${action}`);
}

/** Totals of verified money for the overview cards. Bangkok day/month boundaries. */
export async function moneyTotals(streamerId: string) {
  const now = new Date();
  const bkk = new Date(now.getTime() + 7 * 3600_000);
  const dayStart = new Date(Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), bkk.getUTCDate()) - 7 * 3600_000);
  const monthStart = new Date(Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), 1) - 7 * 3600_000);
  const { data } = await admin()
    .from("transactions")
    .select("amount, verified_at")
    .eq("streamer_id", streamerId)
    .eq("status", "verified")
    .limit(10_000);
  let today = 0, month = 0, all = 0;
  for (const r of data ?? []) {
    const a = Number(r.amount);
    const t = r.verified_at ? new Date(r.verified_at).getTime() : 0;
    all += a;
    if (t >= monthStart.getTime()) month += a;
    if (t >= dayStart.getTime()) today += a;
  }
  return { today, month, all };
}
