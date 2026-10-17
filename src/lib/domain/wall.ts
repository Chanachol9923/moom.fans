import "server-only";
import { getDict, type Locale } from "@/lib/i18n";
import { admin } from "@/lib/supabase/admin";

// Public, read-only aggregates over verified payments: goal progress, supporter
// wall, leaderboard, poll results, subathon clock. Used by the storefront and widgets.
// Sums and rankings run in Postgres (see migration 20261011000001_aggregates.sql);
// only the handful of result rows travel to the app server.

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

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function activeGoal(streamerId: string): Promise<GoalView | null> {
  const db = admin();
  const { data: goal } = await db
    .from("goals")
    .select("id, title, target_amount, ends_at")
    .eq("streamer_id", streamerId)
    .eq("is_active", true)
    .maybeSingle();
  if (!goal) return null;
  const { data: raised } = await db.rpc("goal_raised", { p_goal: goal.id });
  return {
    id: goal.id,
    title: goal.title,
    target: Number(goal.target_amount),
    raised: round2(Number(raised ?? 0)),
    endsAt: goal.ends_at,
  };
}

/** Option totals in option order; options nobody picked are 0. */
export function totalsByOption(optionCount: number, rows: Array<{ option: number; total: number | string }>): number[] {
  const totals = Array<number>(optionCount).fill(0);
  for (const r of rows) {
    if (r.option >= 0 && r.option < optionCount) totals[r.option] = round2(Number(r.total));
  }
  return totals;
}

export async function activePoll(streamerId: string): Promise<PollView | null> {
  const db = admin();
  const { data: poll } = await db
    .from("polls")
    .select("id, title, options, weight_by")
    .eq("streamer_id", streamerId)
    .eq("is_active", true)
    .maybeSingle();
  if (!poll) return null;
  const options = (Array.isArray(poll.options) ? poll.options : []).map(String);
  const { data: rows } = await db.rpc("poll_totals", { p_poll: poll.id });
  return {
    id: poll.id,
    title: poll.title,
    options,
    totals: totalsByOption(options.length, rows ?? []),
    weightBy: poll.weight_by,
  };
}

export async function wallData(
  streamerId: string,
  opts: { recentCount: number; topCount: number; topPeriod: "30d" | "all"; locale: Locale },
) {
  const db = admin();
  const since = opts.topPeriod === "30d" ? new Date(Date.now() - 30 * 86_400_000).toISOString() : null;
  const anonymous = getDict(opts.locale).store.anonymous;
  const [recent, top] = await Promise.all([
    opts.recentCount > 0
      ? db
          .from("transactions")
          .select("supporter_name, is_anonymous, amount, verified_at")
          .eq("streamer_id", streamerId)
          .eq("status", "verified")
          .eq("show_on_wall", true)
          .order("verified_at", { ascending: false })
          .limit(opts.recentCount)
      : Promise.resolve({ data: [] }),
    opts.topCount > 0
      ? db.rpc("top_supporters", { p_streamer: streamerId, p_since: since, p_limit: opts.topCount })
      : Promise.resolve({ data: [] }),
  ]);
  return {
    recent: (recent.data ?? []).map(
      (r): SupporterView => ({
        name: r.is_anonymous ? anonymous : r.supporter_name,
        amount: Number(r.amount),
        at: r.verified_at ?? "",
      }),
    ),
    top: (top.data ?? []).map((r): TopView => ({ name: r.name, total: round2(Number(r.total)) })),
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
