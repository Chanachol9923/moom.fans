import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Locale } from "@moom/shared/i18n";
import type { Database } from "@/lib/supabase/database.types";

const DEFAULTS = {
  th: { goal: "เป้าหมายแรก", poll: "ไลฟ์หน้าทำอะไรดี?", options: ["เล่นเกม", "ร้องเพลง", "คุยเล่น"] },
  en: { goal: "First goal", poll: "What should the next stream be?", options: ["Games", "Karaoke", "Just chatting"] },
} as const;

/** Target of the goal made for a new streamer, in baht. */
export const DEFAULT_GOAL_TARGET = 1000;

/**
 * Every streamer always has one active goal and one active poll, so the goal and poll
 * widgets in OBS always have something to show. A new one replaces the old; there is no
 * "end" without a replacement. Safe to call concurrently: the one-active unique indexes
 * reject a second insert, and that error is ignored.
 *
 * `db` is the streamer's own client (RLS applies) in the dashboard, or the admin client
 * after the OBS token has identified the streamer.
 */
export async function ensureWidgetDefaults(db: SupabaseClient<Database>, streamerId: string, locale: Locale) {
  const t = DEFAULTS[locale] ?? DEFAULTS.th;
  const [{ count: goals, error: ge }, { count: polls, error: pe }] = await Promise.all([
    db.from("goals").select("id", { count: "exact", head: true }).eq("streamer_id", streamerId).eq("is_active", true),
    db.from("polls").select("id", { count: "exact", head: true }).eq("streamer_id", streamerId).eq("is_active", true),
  ]);
  await Promise.all([
    ge || goals ? null : db.from("goals").insert({ streamer_id: streamerId, title: t.goal, target_amount: DEFAULT_GOAL_TARGET }),
    pe || polls ? null : db.from("polls").insert({ streamer_id: streamerId, title: t.poll, options: [...t.options] }),
  ]);
}
