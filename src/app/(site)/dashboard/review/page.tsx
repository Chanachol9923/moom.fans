import { ActionButton } from "@/components/ActionButton";
import { Panel, Tag } from "@/components/ui";
import type { AlertPayload } from "@/lib/alerts/types";
import { requireStreamer } from "@/lib/auth";
import { getPrivate } from "@/lib/domain/streamer";
import { formatBaht } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { BUCKETS } from "@/lib/storage";
import { signedDownloadUrl } from "@/lib/storage.server";
import { approvePayment, rejectPayment, releaseHeldAlert, skipHeldAlert } from "../actions";
import { AutoRefresh } from "./AutoRefresh";

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

export default async function ReviewPage() {
  const { supabase, profile } = await requireStreamer();
  const { d, locale } = await getT();
  const since = hoursAgo(3);
  const [priv, pending, awaiting, held] = await Promise.all([
    getPrivate(profile.id),
    supabase.from("transactions").select("*").eq("status", "pending_review").order("created_at").limit(50),
    supabase
      .from("transactions")
      .select("id, kind, supporter_name, amount, product_title, created_at")
      .eq("status", "awaiting_payment")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("alerts").select("*").eq("status", "held").order("created_at").limit(30),
  ]);

  const slips = new Map<string, string>();
  await Promise.all(
    (pending.data ?? [])
      .filter((t) => t.slip_path)
      .map(async (t) => {
        try {
          slips.set(t.id, await signedDownloadUrl(BUCKETS.slips, t.slip_path!, 600));
        } catch {
          /* missing object: show "no slip" */
        }
      }),
  );
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale === "th" ? "th-TH" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    });

  return (
    <div className="grid gap-5">
      <AutoRefresh seconds={10} />
      <div>
        <h1 className="text-3xl">{d.review.title}</h1>
        <p className="mt-1 text-ink-soft">{d.review.subtitle}</p>
        <p className="mt-1 text-sm text-ink-faint">
          {priv.verify_mode === "slipok" ? d.review.autoMode : d.review.manualMode}
        </p>
      </div>

      <Panel title={`${d.review.pending} (${pending.data?.length ?? 0})`}>
        {pending.data?.length ? (
          <ul className="grid gap-4">
            {pending.data.map((t) => {
              const v = (t.verification ?? {}) as { problems?: string[]; reason?: string; status?: string };
              const slip = slips.get(t.id);
              return (
                <li key={t.id} className="px-frame grid gap-3 bg-paper-2 p-3 sm:grid-cols-[140px_1fr]">
                  {slip ? (
                    <a href={slip} target="_blank" rel="noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
                      <img src={slip} alt={d.review.slip} className="max-h-56 w-full bg-paper object-contain" />
                    </a>
                  ) : (
                    <div className="grid h-32 place-items-center bg-paper text-sm text-ink-faint">{d.review.noSlip}</div>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-num text-2xl">{formatBaht(Number(t.amount), locale)}</span>
                      <Tag>{t.kind === "tip" ? d.review.kindTip : d.review.kindPurchase}</Tag>
                      <span className="text-sm text-ink-faint">
                        {d.review.at} {time(t.submitted_at ?? t.created_at)}
                      </span>
                    </div>
                    <div className="mt-1 font-medium">{t.supporter_name}</div>
                    {t.product_title && <div className="text-ink-soft">{t.product_title}</div>}
                    {t.message && <p className="mt-1 break-words text-ink-soft">“{t.message}”</p>}
                    {t.media_url && (
                      <a href={t.media_url} target="_blank" rel="noreferrer" className="mt-1 block text-sm text-teal underline">
                        ▶ {t.media_url} ({t.media_seconds}s)
                      </a>
                    )}
                    {(v.problems?.length || v.reason) && (
                      <div className="mt-2 bg-beak/30 p-2 text-sm">
                        <span className="font-display">{d.review.checks}: </span>
                        {v.problems?.join(" · ") || v.reason}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ActionButton variant="primary" action={approvePayment.bind(null, t.id)}>
                        ✓ {d.review.approve}
                      </ActionButton>
                      <ActionButton variant="ghost" action={rejectPayment.bind(null, t.id)}>
                        ✕ {d.review.reject}
                      </ActionButton>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-ink-soft">{d.review.none}</p>
        )}
      </Panel>

      {held.data?.length ? (
        <Panel title={`${d.review.heldMedia} (${held.data.length})`}>
          <ul className="grid gap-3">
            {held.data.map((a) => {
              const p = a.payload as unknown as AlertPayload;
              return (
                <li key={a.id} className="px-frame flex flex-wrap items-center gap-3 bg-paper-2 p-3">
                  {p.media && (
                    // eslint-disable-next-line @next/next/no-img-element -- YouTube thumbnail
                    <img
                      src={`https://i.ytimg.com/vi/${p.media.id}/mqdefault.jpg`}
                      alt=""
                      className="h-20 w-36 object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-display">
                      {p.name} · {formatBaht(p.amount, locale)} · {p.media?.seconds}s
                    </div>
                    {p.media && (
                      <a
                        href={`https://www.youtube.com/watch?v=${p.media.id}&t=${p.media.start}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-teal underline"
                      >
                        youtube.com/watch?v={p.media.id}
                      </a>
                    )}
                    {p.message && <p className="text-sm text-ink-soft">{p.message}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ActionButton size="sm" variant="primary" action={releaseHeldAlert.bind(null, a.id, true)}>
                      {d.review.playMedia}
                    </ActionButton>
                    <ActionButton size="sm" action={releaseHeldAlert.bind(null, a.id, false)}>
                      {d.review.dropMedia}
                    </ActionButton>
                    <ActionButton size="sm" variant="ghost" action={skipHeldAlert.bind(null, a.id)}>
                      {d.review.skip}
                    </ActionButton>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : null}

      {awaiting.data?.length ? (
        <Panel title={`${d.review.awaiting} (${awaiting.data.length})`}>
          <ul className="grid gap-1 text-sm">
            {awaiting.data.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3">
                <span className="text-ink-faint">{time(t.created_at)}</span>
                <span className="font-num">{formatBaht(Number(t.amount), locale)}</span>
                <span>{t.supporter_name}</span>
                {t.product_title && <span className="text-ink-soft">· {t.product_title}</span>}
                <span className="ml-auto flex gap-2">
                  <ActionButton size="sm" action={approvePayment.bind(null, t.id)}>
                    ✓ {d.review.approve}
                  </ActionButton>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
