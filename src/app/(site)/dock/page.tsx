import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/ActionButton";
import type { AlertPayload } from "@moom/shared/alerts";
import { requireStreamer } from "@/lib/auth";
import { formatBaht } from "@moom/shared/i18n";
import { getT } from "@/lib/i18n/server";
import { BUCKETS } from "@/lib/storage";
import { signedDownloadUrl } from "@/lib/storage.server";
import { approvePayment, rejectPayment, releaseHeldAlert, sendControl, skipHeldAlert } from "../dashboard/actions";
import { AutoRefresh } from "../dashboard/review/AutoRefresh";

export const metadata: Metadata = { title: "Dock", robots: { index: false, follow: false } };

// Compact control panel for an OBS "Custom Browser Dock" (Saweria-style overlay control):
// approve slips, release clips and hit panic without leaving OBS.
export default async function DockPage() {
  const { supabase, profile } = await requireStreamer();
  const { d, locale } = await getT();
  const [pending, held, queued] = await Promise.all([
    supabase.from("transactions").select("*").eq("status", "pending_review").order("created_at").limit(20),
    supabase.from("alerts").select("id, payload").eq("status", "held").order("created_at").limit(10),
    supabase.from("alerts").select("id", { count: "exact", head: true }).eq("status", "queued"),
  ]);
  const slips = new Map<string, string>();
  await Promise.all(
    (pending.data ?? [])
      .filter((t) => t.slip_path)
      .map(async (t) => {
        try {
          slips.set(t.id, await signedDownloadUrl(BUCKETS.slips, t.slip_path!, 600));
        } catch {
          /* missing */
        }
      }),
  );

  return (
    <main className="min-h-dvh p-2 text-sm" style={{ ["--accent" as string]: profile.accent_color }}>
      <AutoRefresh seconds={5} />
      <div className="mb-2 flex flex-wrap gap-1">
        <ActionButton size="sm" variant="danger" action={sendControl.bind(null, "panic")}>
          ■ {d.overlay.panic}
        </ActionButton>
        <ActionButton size="sm" action={sendControl.bind(null, "resume")}>
          ▶
        </ActionButton>
        <ActionButton size="sm" variant="ghost" action={sendControl.bind(null, "skip")}>
          ⏭
        </ActionButton>
        <span className="ml-auto self-center font-display text-xs text-ink-faint">
          {d.overlay.queue}: <span className="font-num">{queued.count ?? 0}</span>
        </span>
      </div>

      <h1 className="font-display text-base">
        {d.dock.pending} <span className="font-num">({pending.data?.length ?? 0})</span>
      </h1>
      {pending.data?.length ? (
        <ul className="mt-1 grid gap-2">
          {pending.data.map((t) => (
            <li key={t.id} className="px-frame bg-paper p-2">
              <div className="flex items-baseline gap-2">
                <span className="font-num text-lg">{formatBaht(Number(t.amount), locale)}</span>
                <span className="truncate font-medium">{t.supporter_name}</span>
              </div>
              {t.message && <p className="line-clamp-2 text-ink-soft">{t.message}</p>}
              {slips.get(t.id) && (
                <a href={slips.get(t.id)} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
                  <img src={slips.get(t.id)} alt={d.review.slip} className="mt-1 max-h-40 w-full bg-paper-2 object-contain" />
                </a>
              )}
              <div className="mt-1 flex gap-1">
                <ActionButton size="sm" variant="primary" action={approvePayment.bind(null, t.id)}>
                  ✓ {d.review.approve}
                </ActionButton>
                <ActionButton size="sm" variant="ghost" action={rejectPayment.bind(null, t.id)}>
                  ✕
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-ink-faint">{d.dock.allClear}</p>
      )}

      {held.data?.length ? (
        <>
          <h2 className="mt-3 font-display text-base">{d.review.heldMedia}</h2>
          <ul className="mt-1 grid gap-2">
            {held.data.map((a) => {
              const p = a.payload as unknown as AlertPayload;
              return (
                <li key={a.id} className="px-frame bg-paper p-2">
                  <div className="font-display">
                    {p.name} · <span className="font-num">{p.media?.seconds}s</span>
                  </div>
                  {p.media && (
                    // eslint-disable-next-line @next/next/no-img-element -- YouTube thumbnail
                    <img src={`https://i.ytimg.com/vi/${p.media.id}/mqdefault.jpg`} alt="" className="mt-1 w-full" />
                  )}
                  <div className="mt-1 flex flex-wrap gap-1">
                    <ActionButton size="sm" variant="primary" action={releaseHeldAlert.bind(null, a.id, true)}>
                      ▶
                    </ActionButton>
                    <ActionButton size="sm" action={releaseHeldAlert.bind(null, a.id, false)}>
                      {d.review.dropMedia}
                    </ActionButton>
                    <ActionButton size="sm" variant="ghost" action={skipHeldAlert.bind(null, a.id)}>
                      ✕
                    </ActionButton>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      <Link href="/dashboard" target="_blank" className="mt-4 block text-center text-xs text-accent underline">
        {d.dock.openFull} ↗
      </Link>
    </main>
  );
}
