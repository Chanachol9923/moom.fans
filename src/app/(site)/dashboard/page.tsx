import Link from "next/link";
import { CopyField } from "@moom/shared/ui/CopyField";
import { Panel, Stat, Tag } from "@moom/shared/ui/kit";
import { requireStreamer } from "@/lib/auth";
import { getPrivate, moneyTotals, overlayUrl } from "@/lib/domain/streamer";
import { creatorUrl } from "@/lib/hosts";
import { fmt, formatBaht } from "@moom/shared/i18n";
import { supporterLabel } from "@/lib/supporter";
import { getT } from "@/lib/i18n/server";
import { DEFAULT_PAGE_CONFIG, parsePageConfig } from "@/lib/page-config";
import { SetupChecklist, type SetupState } from "./SetupChecklist";

export default async function Overview() {
  const { supabase, profile } = await requireStreamer();
  const { d, locale } = await getT();
  const [priv, totals, recent, pending, played, tipped] = await Promise.all([
    getPrivate(profile.id),
    moneyTotals(profile.id),
    supabase
      .from("transactions")
      .select(
        "id, kind, supporter_name, is_anonymous, amount, message, product_title, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review"),
    // An overlay somewhere has played an alert: OBS is set up.
    supabase
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .eq("status", "done"),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("status", "verified"),
  ]);
  // What makes a page feel like theirs: a picture, or a theme/background of their own.
  const cfg = parsePageConfig(profile.page);
  const setup: SetupState = {
    styled:
      !!profile.avatar_path ||
      !!profile.banner_path ||
      cfg.theme !== DEFAULT_PAGE_CONFIG.theme ||
      !!cfg.backgroundImagePath,
    obs: (played.count ?? 0) > 0,
    firstTip: (tipped.count ?? 0) > 0,
  };
  const setupDone = setup.styled && setup.obs && setup.firstTip;

  const statusTone = {
    verified: "ok",
    pending_review: "warn",
    rejected: "bad",
  } as const;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-3xl">
          {fmt(d.dash.hello, { name: profile.display_name })}
        </h1>
        {pending.count ? (
          <Link
            href="/dashboard/review"
            className="font-display text-tomato underline"
          >
            {fmt(d.dash.pendingCount, { count: pending.count })} →
          </Link>
        ) : null}
      </div>

      {/* Before setup is done the checklist matters more than three zeros. */}
      {!setupDone && (
        <SetupChecklist
          state={setup}
          pageUrl={creatorUrl(profile.slug)}
          overlayUrl={overlayUrl(priv.overlay_token)}
        />
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-3 [&_.font-num]:text-lg sm:[&_.font-num]:text-2xl">
        <Stat label={d.dash.today} value={formatBaht(totals.today, locale)} />
        <Stat
          label={d.dash.thisMonth}
          value={formatBaht(totals.month, locale)}
        />
        <Stat label={d.dash.allTime} value={formatBaht(totals.all, locale)} />
      </div>

      {setupDone && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title={d.dash.yourPage}>
            <CopyField value={creatorUrl(profile.slug)} />
            <h3 className="mt-4 mb-1 text-base">{d.dash.overlayUrl}</h3>
            <CopyField value={overlayUrl(priv.overlay_token)} secret />
          </Panel>
          <Panel title={d.dash.setupSteps}>
            <ol className="grid gap-2">
              {[d.dash.step1, d.dash.step2, d.dash.step3].map((s, i) => (
                <li key={s} className="flex gap-2">
                  <span className="grid size-6 shrink-0 place-items-center bg-ink font-display text-xs text-paper">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
            <Link
              href="/dashboard/overlay"
              className="mt-3 inline-block font-display text-teal underline"
            >
              {d.nav.overlay} →
            </Link>
          </Panel>
        </div>
      )}

      <Panel title={d.dash.recent}>
        {recent.data?.length ? (
          <ul className="divide-y-2 divide-dashed divide-ink/15">
            {recent.data.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2"
              >
                <span className="font-num">
                  {formatBaht(Number(t.amount), locale)}
                </span>
                <span className="font-medium">{supporterLabel(t, d)}</span>
                <span className="min-w-0 flex-1 truncate text-ink-soft">
                  {t.kind === "purchase"
                    ? `[${d.review.kindPurchase}] ${t.product_title}`
                    : t.message}
                </span>
                <Tag
                  tone={
                    statusTone[t.status as keyof typeof statusTone] ?? "muted"
                  }
                >
                  {d.ledger.status[t.status]}
                </Tag>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-soft">{d.dash.empty}</p>
        )}
      </Panel>
    </div>
  );
}
