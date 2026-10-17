import { ActionButton } from "@/components/ActionButton";
import { Panel, Tag } from "@/components/ui";
import type { AlertPayload } from "@moom/shared/alerts";
import { formatBaht } from "@moom/shared/i18n";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { AutoRefresh } from "../review/AutoRefresh";
import { removeQueued, replay } from "../more-actions";

/** Saweria/Trakteer-style overlay control: see what's queued, drop or replay alerts. */
export async function AlertQueue({ streamerId }: { streamerId: string }) {
  const supabase = await createClient();
  const { d, locale } = await getT();
  const [{ data: queued }, { data: played }] = await Promise.all([
    supabase
      .from("alerts")
      .select("id, kind, payload, status, created_at")
      .eq("streamer_id", streamerId)
      .in("status", ["queued", "playing", "held"])
      .order("created_at")
      .limit(30),
    supabase
      .from("alerts")
      .select("id, kind, payload, status, finished_at")
      .eq("streamer_id", streamerId)
      .in("status", ["done", "skipped"])
      .order("finished_at", { ascending: false })
      .limit(10),
  ]);
  const line = (p: AlertPayload) => (
    <>
      <span className="font-num">{formatBaht(p.amount, locale)}</span>
      <span className="font-medium">{p.name}</span>
      <span className="min-w-0 flex-1 truncate text-ink-soft">{p.productTitle ?? p.message}</span>
    </>
  );
  return (
    <Panel title={d.overlay.queue}>
      <AutoRefresh seconds={8} />
      {queued?.length ? (
        <ul className="grid gap-1 text-sm">
          {queued.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2">
              <Tag tone={a.status === "playing" ? "ok" : a.status === "held" ? "warn" : "muted"}>{a.status}</Tag>
              {line(a.payload as unknown as AlertPayload)}
              {a.status !== "playing" && (
                <ActionButton size="sm" variant="ghost" action={removeQueued.bind(null, a.id)}>
                  {d.overlay.remove}
                </ActionButton>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-faint">{d.overlay.queueEmpty}</p>
      )}
      {played?.length ? (
        <details className="mt-3">
          <summary className="cursor-pointer font-display text-sm">{d.overlay.recentAlerts}</summary>
          <ul className="mt-2 grid gap-1 text-sm">
            {played.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2">
                {line(a.payload as unknown as AlertPayload)}
                <ActionButton size="sm" action={replay.bind(null, a.id)}>
                  ↻ {d.overlay.replay}
                </ActionButton>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Panel>
  );
}
