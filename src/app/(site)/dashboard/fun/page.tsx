import Link from "next/link";
import { ActionButton } from "@/components/ActionButton";
import { CopyField } from "@moom/shared/ui/CopyField";
import { Panel, buttonClass } from "@moom/shared/ui/kit";
import { requireStreamer } from "@/lib/auth";
import { ensureWidgetDefaults } from "@/lib/domain/defaults";
import { getPrivate } from "@/lib/domain/streamer";
import { activePoll } from "@/lib/domain/wall";
import { siteUrl } from "@/lib/hosts";
import { fmt, formatBaht } from "@moom/shared/i18n";
import { getT } from "@/lib/i18n/server";
import { parseWheel } from "@moom/shared/wheel";
import { WIDGET_SIZES } from "@moom/shared/widgets";
import { sendTestAlert } from "../actions";
import { PreviewFrame } from "../overlay/PreviewFrame";
import { FunTabs } from "./FunTabs";
import { PollForm } from "./PollForm";
import { SubathonPanel } from "./SubathonPanel";
import { WheelEditor } from "./WheelEditor";
import { WheelPlacePicker } from "./WheelPlacePicker";

/** The server renders once per request; the clock itself ticks in SubathonPanel. */
function isFuture(iso: string | null) {
  return Boolean(iso) && new Date(iso!).getTime() > Date.now();
}

export default async function FunPage() {
  const { supabase, profile } = await requireStreamer();
  const { d, locale } = await getT();
  await ensureWidgetDefaults(supabase, profile.id, profile.locale);
  const [{ data: s }, poll, priv] = await Promise.all([
    supabase
      .from("overlay_settings")
      .select("wheel, subathon_seconds_per_baht, subathon_ends_at, subathon_paused_left")
      .eq("streamer_id", profile.id)
      .single(),
    activePoll(profile.id),
    getPrivate(profile.id),
  ]);
  if (!s) throw new Error("overlay settings missing");
  const f = d.fun;
  const wheel = parseWheel(s.wheel);
  const total = poll ? poll.totals.reduce((a, b) => a + b, 0) || 1 : 1;
  const subRunning = isFuture(s.subathon_ends_at);
  const subPaused = s.subathon_paused_left !== null;
  const widget = (kind: "poll" | "subathon" | "wheel") => siteUrl(`/widget/${priv.overlay_token}/${kind}`);

  /** Right-hand card: how the tool shows up on stream. */
  const obsCard = (children: React.ReactNode) => (
    <Panel title={f.onObs} className="lg:sticky lg:top-4">
      {children}
    </Panel>
  );

  const layout = (settings: React.ReactNode, obs: React.ReactNode) => (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
      {settings}
      {obs}
    </div>
  );

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-3xl">{f.title}</h1>
        <p className="mt-1 text-ink-soft">{f.subtitle}</p>
      </div>
      <FunTabs
        tabs={[
          {
            id: "wheel",
            name: f.wheel,
            what: f.wheelWhat,
            on: wheel.enabled,
            status: wheel.enabled ? fmt(f.wheelOn, { min: formatBaht(wheel.min_amount, locale) }) : f.statusOff,
            body: layout(
              <Panel title={f.settingsTitle}>
                <WheelEditor initial={wheel} accent={profile.accent_color} />
              </Panel>,
              obsCard(
                <>
                  <WheelPlacePicker place={wheel.place} />
                  {wheel.place === "widget" ? (
                    <>
                      <p className="mb-3 text-sm text-ink-soft">{f.wheelWidgetObs}</p>
                      <PreviewFrame src={`${widget("wheel")}?preview=1`} width={WIDGET_SIZES.wheel[0]} height={WIDGET_SIZES.wheel[1]} />
                      <div className="mt-3">
                        <CopyField value={widget("wheel")} secret />
                      </div>
                    </>
                  ) : (
                    <p className="mb-3 text-sm text-ink-soft">{f.wheelObs}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ActionButton size="sm" variant="beak" action={sendTestAlert.bind(null, "wheel")}>
                      {d.overlay.testWheel}
                    </ActionButton>
                    <Link href="/dashboard/overlay" className={buttonClass("ghost", "sm")}>
                      {f.toOverlay}
                    </Link>
                  </div>
                </>,
              ),
            ),
          },
          {
            id: "poll",
            name: f.poll,
            what: f.pollWhat,
            on: Boolean(poll),
            status: poll ? f.pollOn : f.statusOff,
            body: layout(
              <div className="grid gap-5">
                {poll && (
                  <Panel title={f.pollNow}>
                    <h3 className="text-lg">{poll.title}</h3>
                    <p className="mb-2 text-sm text-ink-faint">
                      {poll.weightBy === "amount" ? d.store.weightAmount : d.store.weightCount}
                    </p>
                    <ul className="grid gap-2">
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
                  </Panel>
                )}
                <Panel title={f.pollNew}>
                  <p className="mb-3 text-sm text-ink-soft">{f.pollNewHint}</p>
                  <PollForm />
                </Panel>
              </div>,
              obsCard(
                <>
                  <p className="mb-3 text-sm text-ink-soft">{f.pollObs}</p>
                  <PreviewFrame src={widget("poll")} width={WIDGET_SIZES.poll[0]} height={WIDGET_SIZES.poll[1]} />
                  <div className="mt-3">
                    <CopyField value={widget("poll")} secret />
                  </div>
                </>,
              ),
            ),
          },
          {
            id: "subathon",
            name: f.subathon,
            what: f.subathonWhat,
            on: subRunning,
            status: subRunning ? f.subathonRunning : subPaused ? f.subathonPause : f.subathonIdle,
            body: layout(
              <Panel title={f.settingsTitle}>
                <SubathonPanel
                  rate={Number(s.subathon_seconds_per_baht)}
                  endsAt={s.subathon_ends_at}
                  pausedLeft={s.subathon_paused_left}
                />
              </Panel>,
              obsCard(
                <>
                  <p className="mb-3 text-sm text-ink-soft">{f.subathonObs}</p>
                  <PreviewFrame src={widget("subathon")} width={WIDGET_SIZES.subathon[0]} height={WIDGET_SIZES.subathon[1]} />
                  <div className="mt-3">
                    <CopyField value={widget("subathon")} secret />
                  </div>
                </>,
              ),
            ),
          },
        ]}
      />
    </div>
  );
}
