import "server-only";
import { activeGoal, activePoll, subathonState, wallData } from "@/lib/domain/wall";
import { publicEnv } from "@/lib/env";
import { creatorUrl } from "@/lib/hosts";
import { parsePageConfig } from "@/lib/page-config";
import { overlayTopic } from "@/lib/realtime";
import { admin } from "@/lib/supabase/admin";
import type { WidgetData } from "@moom/shared/widgets";
import { streamerByOverlayToken } from "./overlay";

export async function loadWidgetData(token: string): Promise<WidgetData | null> {
  const s = await streamerByOverlayToken(token);
  if (!s) return null;
  const { data: profile } = await admin()
    .from("profiles")
    .select("slug, accent_color, locale, page")
    .eq("id", s.streamer_id)
    .single();
  if (!profile) return null;
  const page = parsePageConfig(profile.page);
  const [goal, wall, poll, subathon] = await Promise.all([
    activeGoal(s.streamer_id),
    wallData(s.streamer_id, { recentCount: 10, topCount: 5, topPeriod: page.wall.topPeriod, locale: profile.locale }),
    activePoll(s.streamer_id),
    subathonState(s.streamer_id),
  ]);
  return {
    accent: profile.accent_color,
    locale: profile.locale,
    pageUrl: creatorUrl(profile.slug),
    showAmounts: page.wall.showAmounts,
    topPeriod: page.wall.topPeriod,
    goal: goal && { title: goal.title, raised: goal.raised, target: goal.target, endsAt: goal.endsAt },
    recent: wall.recent,
    top: wall.top,
    poll: poll && { title: poll.title, options: poll.options, totals: poll.totals, weightBy: poll.weightBy },
    subathon,
    realtime: { url: publicEnv.supabaseUrl(), key: publicEnv.supabaseKey(), channel: overlayTopic(s.overlay_channel) },
  };
}
