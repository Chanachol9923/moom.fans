import { ActionButton } from "@/components/ActionButton";
import { GoalBar } from "@moom/shared/ui/GoalBar";
import { Panel } from "@moom/shared/ui/kit";
import { requireStreamer } from "@/lib/auth";
import { activeGoal } from "@/lib/domain/wall";
import { formatBaht } from "@moom/shared/i18n";
import { getT } from "@/lib/i18n/server";
import { deleteGoal, endGoal } from "../more-actions";
import { GoalForm } from "./GoalForm";
import { GoalLookEditor } from "./GoalLookEditor";
import { parseGoalLook } from "@moom/shared/goal-look";
import { parsePresets } from "@moom/shared/presets";
import { parsePageConfig } from "@/lib/page-config";
import { publicEnv } from "@/lib/env";

export default async function GoalsPage() {
  const { supabase, profile } = await requireStreamer();
  const { d, locale } = await getT();
  const [goal, { data: past }, { data: settings }] = await Promise.all([
    activeGoal(profile.id),
    supabase.from("goals").select("*").eq("streamer_id", profile.id).eq("is_active", false).order("created_at", { ascending: false }).limit(20),
    // "*" so a database that hasn't got widget_looks yet still opens this page.
    supabase.from("overlay_settings").select("*").eq("streamer_id", profile.id).maybeSingle(),
  ]);
  const looks = (settings?.widget_looks ?? {}) as Record<string, unknown>;
  const page = parsePageConfig(profile.page);
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "th" ? "th-TH" : "en-GB", { dateStyle: "medium", timeZone: "Asia/Bangkok" });

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-3xl">{d.goals.title}</h1>
        <p className="mt-1 text-ink-soft">{d.goals.subtitle}</p>
      </div>

      <Panel title={d.goals.new}>
        {goal && <p className="mb-3 text-sm text-ink-faint">{d.goals.replaceHint}</p>}
        <GoalForm />
      </Panel>

      {goal ? (
        <Panel title={d.goals.active} aside={<ActionButton size="sm" variant="ghost" action={endGoal.bind(null, goal.id)}>{d.goals.end}</ActionButton>}>
          <GoalBar {...goal} accent={profile.accent_color} d={d} locale={locale} />
        </Panel>
      ) : (
        <Panel>
          <p className="text-ink-soft">{d.goals.none}</p>
        </Panel>
      )}

      <Panel title={d.goalLook.title}>
        <p className="mb-4 max-w-2xl text-ink-soft">{d.goalLook.intro}</p>
        <GoalLookEditor
          initial={parseGoalLook(looks.goal)}
          presets={parsePresets(settings?.look_presets)}
          sample={goal ? { title: goal.title, raised: goal.raised, target: goal.target, endsAt: goal.endsAt } : { title: d.goalLook.sampleTitle, raised: 2730, target: 4500, endsAt: null }}
          accent={profile.accent_color}
          locale={locale}
          brandFont={Boolean(page.brandFontPath)}
          userId={profile.id}
          supabase={{ url: publicEnv.supabaseUrl(), key: publicEnv.supabaseKey() }}
        />
      </Panel>

      {past?.length ? (
        <Panel title={d.goals.history}>
          <ul className="grid gap-1 text-sm">
            {past.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-3">
                <span className="text-ink-faint">{date(g.created_at)}</span>
                <span className="font-display">{g.title}</span>
                <span className="font-num text-ink-soft">{formatBaht(Number(g.target_amount), locale)}</span>
                <ActionButton size="sm" variant="ghost" className="ml-auto" action={deleteGoal.bind(null, g.id)}>
                  {d.common.delete}
                </ActionButton>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
