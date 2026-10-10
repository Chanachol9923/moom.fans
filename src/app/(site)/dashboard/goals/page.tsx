import { ActionButton } from "@/components/ActionButton";
import { GoalBar } from "@/components/GoalBar";
import { Panel } from "@/components/ui";
import { requireStreamer } from "@/lib/auth";
import { activeGoal } from "@/lib/domain/wall";
import { formatBaht } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { deleteGoal, endGoal } from "../more-actions";
import { GoalForm } from "./GoalForm";

export default async function GoalsPage() {
  const { supabase, profile } = await requireStreamer();
  const { d, locale } = await getT();
  const [goal, { data: past }] = await Promise.all([
    activeGoal(profile.id),
    supabase.from("goals").select("*").eq("streamer_id", profile.id).eq("is_active", false).order("created_at", { ascending: false }).limit(20),
  ]);
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "th" ? "th-TH" : "en-GB", { dateStyle: "medium", timeZone: "Asia/Bangkok" });

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-3xl">{d.goals.title}</h1>
        <p className="mt-1 text-ink-soft">{d.goals.subtitle}</p>
      </div>

      {goal ? (
        <Panel title={d.goals.active} aside={<ActionButton size="sm" variant="ghost" action={endGoal.bind(null, goal.id)}>{d.goals.end}</ActionButton>}>
          <GoalBar {...goal} accent={profile.accent_color} d={d} locale={locale} />
        </Panel>
      ) : (
        <Panel>
          <p className="text-ink-soft">{d.goals.none}</p>
        </Panel>
      )}

      <Panel title={d.goals.new}>
        {goal && <p className="mb-3 text-sm text-ink-faint">{d.goals.replaceHint}</p>}
        <GoalForm />
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
