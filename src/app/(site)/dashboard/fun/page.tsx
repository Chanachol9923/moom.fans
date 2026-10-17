import { ActionButton } from "@/components/ActionButton";
import { Panel } from "@/components/ui";
import { requireStreamer } from "@/lib/auth";
import { activePoll } from "@/lib/domain/wall";
import { formatBaht } from "@moom/shared/i18n";
import { getT } from "@/lib/i18n/server";
import { parseWheel } from "@moom/shared/wheel";
import { sendTestAlert } from "../actions";
import { closePoll } from "../more-actions";
import { PollForm } from "./PollForm";
import { SubathonPanel } from "./SubathonPanel";
import { WheelEditor } from "./WheelEditor";

export default async function FunPage() {
  const { supabase, profile } = await requireStreamer();
  const { d, locale } = await getT();
  const [{ data: s }, poll] = await Promise.all([
    supabase
      .from("overlay_settings")
      .select("wheel, subathon_seconds_per_baht, subathon_ends_at, subathon_paused_left")
      .eq("streamer_id", profile.id)
      .single(),
    activePoll(profile.id),
  ]);
  if (!s) throw new Error("overlay settings missing");
  const total = poll ? poll.totals.reduce((a, b) => a + b, 0) || 1 : 1;

  return (
    <div className="grid gap-5">
      <h1 className="text-3xl">{d.fun.title}</h1>

      <Panel title={d.fun.wheel} aside={<ActionButton size="sm" variant="beak" action={sendTestAlert.bind(null, "wheel")}>{d.overlay.testWheel}</ActionButton>}>
        <p className="mb-3 text-sm text-ink-soft">{d.fun.wheelHint}</p>
        <WheelEditor initial={parseWheel(s.wheel)} />
      </Panel>

      <Panel title={d.fun.poll}>
        <p className="mb-3 text-sm text-ink-soft">{d.fun.pollHint}</p>
        {poll ? (
          <div className="mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg">{poll.title}</h3>
              <ActionButton size="sm" variant="ghost" action={closePoll.bind(null, poll.id)}>
                {d.fun.pollClose}
              </ActionButton>
            </div>
            <ul className="mt-2 grid gap-2">
              {poll.options.map((o, i) => (
                <li key={i}>
                  <div className="flex justify-between text-sm">
                    <span className="font-display">{o}</span>
                    <span className="font-num">
                      {poll.weightBy === "amount" ? formatBaht(poll.totals[i], locale) : poll.totals[i]} ·{" "}
                      {Math.round((poll.totals[i] / total) * 100)}%
                    </span>
                  </div>
                  <div className="h-3 bg-paper-2">
                    <div className="h-full" style={{ width: `${(poll.totals[i] / total) * 100}%`, background: profile.accent_color }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mb-3 text-ink-faint">{d.fun.pollNone}</p>
        )}
        <PollForm />
      </Panel>

      <Panel title={d.fun.subathon}>
        <p className="mb-3 text-sm text-ink-soft">{d.fun.subathonHint}</p>
        <SubathonPanel
          rate={Number(s.subathon_seconds_per_baht)}
          endsAt={s.subathon_ends_at}
          pausedLeft={s.subathon_paused_left}
        />
      </Panel>
    </div>
  );
}
