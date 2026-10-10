import "server-only";
import { getDict, type Locale } from "@/lib/i18n";
import { admin } from "@/lib/supabase/admin";
import type { GoalRow, PollRow } from "@/lib/supabase/database.types";

// Public, read-only aggregates over verified payments: goal progress, supporter
// wall, leaderboard, poll results, subathon clock. Used by the storefront and widgets.

export type GoalView = {
  id: string;
  title: string;
  target: number;
  raised: number;
  endsAt: string | null;
};

export type SupporterView = { name: string; amount: number; at: string };
export type TopView = { name: string; total: number };
export type PollView = { id: string; title: string; options: string[]; totals: number[]; weightBy: "amount" | "count" };
export type SubathonView = { endsAt: string | null; pausedLeft: number | null };

type Tx = {
  amount: number;
  supporter_name: string;
  is_anonymous: boolean;
  show_on_wall: boolean;
  kind: "tip" | "purchase";
  verified_at: string | null;
  poll_id: string | null;
  poll_option: number | null;
};

async function verifiedSince(streamerId: string, since: string | null, limit = 5000): Promise<Tx[]> {
  let q = admin()
    .from("transactions")
    .select("amount, supporter_name, is_anonymous, show_on_wall, kind, verified_at, poll_id, poll_option")
    .eq("streamer_id", streamerId)
    .eq("status", "verified")
    .order("verified_at", { ascending: false })
    .limit(limit);
  if (since) q = q.gte("verified_at", since);
  const { data } = await q;
  return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) }));
}

export function goalRaised(goal: Pick<GoalRow, "starting_amount" | "include_purchases" | "starts_at" | "ends_at">, txs: Tx[]) {
  const start = new Date(goal.starts_at).getTime();
  const end = goal.ends_at ? new Date(goal.ends_at).getTime() : Infinity;
  let sum = Number(goal.starting_amount);
  for (const t of txs) {
    if (!t.verified_at) continue;
    const at = new Date(t.verified_at).getTime();
    if (at < start || at > end) continue;
    if (t.kind === "purchase" && !goal.include_purchases) continue;
    sum += t.amount;
  }
  return Math.round(sum * 100) / 100;
}

export async function activeGoal(streamerId: string): Promise<GoalView | null> {
  const { data: goal } = await admin()
    .from("goals")
    .select("*")
    .eq("streamer_id", streamerId)
    .eq("is_active", true)
    .maybeSingle();
  if (!goal) return null;
  const txs = await verifiedSince(streamerId, goal.starts_at, 20_000);
  return {
    id: goal.id,
    title: goal.title,
    target: Number(goal.target_amount),
    raised: goalRaised(goal, txs),
    endsAt: goal.ends_at,
  };
}

function displayName(t: Tx, locale: Locale) {
  return t.is_anonymous ? getDict(locale).store.anonymous : t.supporter_name;
}

export function recentFrom(txs: Tx[], n: number, locale: Locale): SupporterView[] {
  return txs
    .filter((t) => t.show_on_wall)
    .slice(0, n)
    .map((t) => ({ name: displayName(t, locale), amount: t.amount, at: t.verified_at ?? "" }));
}

/** Leaderboard by name, case-insensitive. Anonymous and hidden tips don't rank. */
export function topFrom(txs: Tx[], n: number): TopView[] {
  const sums = new Map<string, TopView>();
  for (const t of txs) {
    if (t.is_anonymous || !t.show_on_wall) continue;
    const key = t.supporter_name.trim().toLowerCase();
    if (!key || key === "-") continue;
    const cur = sums.get(key) ?? { name: t.supporter_name.trim(), total: 0 };
    cur.total = Math.round((cur.total + t.amount) * 100) / 100;
    sums.set(key, cur);
  }
  return [...sums.values()].sort((a, b) => b.total - a.total).slice(0, n);
}

export function pollTotals(poll: Pick<PollRow, "id" | "options" | "weight_by">, txs: Tx[]): number[] {
  const n = Array.isArray(poll.options) ? poll.options.length : 0;
  const totals = Array<number>(n).fill(0);
  for (const t of txs) {
    if (t.poll_id !== poll.id || t.poll_option === null || t.poll_option >= n) continue;
    totals[t.poll_option] += poll.weight_by === "count" ? 1 : t.amount;
  }
  return totals.map((x) => Math.round(x * 100) / 100);
}

export async function activePoll(streamerId: string): Promise<PollView | null> {
  const { data: poll } = await admin()
    .from("polls")
    .select("*")
    .eq("streamer_id", streamerId)
    .eq("is_active", true)
    .maybeSingle();
  if (!poll) return null;
  const txs = await verifiedSince(streamerId, poll.created_at, 20_000);
  return {
    id: poll.id,
    title: poll.title,
    options: (poll.options as unknown[]).map(String),
    totals: pollTotals(poll, txs),
    weightBy: poll.weight_by,
  };
}

export async function wallData(
  streamerId: string,
  opts: { recentCount: number; topCount: number; topPeriod: "30d" | "all"; locale: Locale },
) {
  const since = opts.topPeriod === "30d" ? new Date(Date.now() - 30 * 86_400_000).toISOString() : null;
  const txs = await verifiedSince(streamerId, since);
  // Recent list is always newest-first regardless of the leaderboard window.
  const recentTxs = since ? txs : txs.slice(0, 200);
  return {
    recent: recentFrom(recentTxs, opts.recentCount, opts.locale),
    top: topFrom(txs, opts.topCount),
  };
}

export async function subathonState(streamerId: string): Promise<SubathonView> {
  const { data } = await admin()
    .from("overlay_settings")
    .select("subathon_ends_at, subathon_paused_left")
    .eq("streamer_id", streamerId)
    .single();
  return { endsAt: data?.subathon_ends_at ?? null, pausedLeft: data?.subathon_paused_left ?? null };
}
