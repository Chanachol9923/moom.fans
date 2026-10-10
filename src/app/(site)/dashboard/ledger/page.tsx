import { Panel, Tag } from "@/components/ui";
import { requireStreamer } from "@/lib/auth";
import { formatBaht } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";

const PAGE = 100;

export default async function LedgerPage({ searchParams }: PageProps<"/dashboard/ledger">) {
  const { supabase } = await requireStreamer();
  const { d, locale } = await getT();
  const sp = await searchParams;
  const page = Math.max(0, Number(sp.page ?? 0) || 0);
  const [{ data: rows }, { data: downloads }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, kind, supporter_name, supporter_email, amount, message, product_title, status, verify_method, created_at, download_count")
      .order("created_at", { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1),
    supabase.from("downloads").select("id, transaction_id, created_at").order("created_at", { ascending: false }).limit(20),
  ]);
  const when = (iso: string) =>
    new Date(iso).toLocaleString(locale === "th" ? "th-TH" : "en-GB", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    });
  const total = (rows ?? []).filter((r) => r.status === "verified").reduce((s, r) => s + Number(r.amount), 0);
  const tone = { verified: "ok", pending_review: "warn", rejected: "bad" } as const;

  return (
    <div className="grid gap-5">
      <h1 className="text-3xl">{d.ledger.title}</h1>
      <Panel aside={<span className="font-display">{d.ledger.total}: {formatBaht(total, locale)}</span>}>
        {rows?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="font-display text-ink-soft">
                <tr>
                  <th className="py-1 pr-3">#</th>
                  <th className="py-1 pr-3">{d.store.amount}</th>
                  <th className="py-1 pr-3">{d.store.yourName}</th>
                  <th className="py-1 pr-3">{d.store.message}</th>
                  <th className="py-1 pr-3" />
                  <th className="py-1">{d.ledger.downloads}</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-dashed divide-ink/10">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="py-2 pr-3 whitespace-nowrap text-ink-faint">{when(r.created_at)}</td>
                    <td className="font-num py-2 pr-3 whitespace-nowrap">{formatBaht(Number(r.amount), locale)}</td>
                    <td className="py-2 pr-3">
                      {r.supporter_name}
                      {r.supporter_email && <div className="text-xs text-ink-faint">{r.supporter_email}</div>}
                    </td>
                    <td className="max-w-xs py-2 pr-3 break-words text-ink-soft">
                      {r.kind === "purchase" ? <Tag>{r.product_title}</Tag> : r.message}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <Tag tone={tone[r.status as keyof typeof tone] ?? "muted"}>{d.ledger.status[r.status]}</Tag>
                      {r.verify_method && <span className="ml-1 text-xs text-ink-faint">{d.ledger.method[r.verify_method]}</span>}
                    </td>
                    <td className="py-2 text-center">{r.kind === "purchase" ? r.download_count : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-ink-soft">{d.ledger.none}</p>
        )}
        <div className="mt-3 flex gap-3 font-display text-sm">
          {page > 0 && <a href={`?page=${page - 1}`}>← {page}</a>}
          {rows?.length === PAGE && <a href={`?page=${page + 1}`}>{page + 2} →</a>}
        </div>
      </Panel>

      {downloads?.length ? (
        <Panel title={d.ledger.downloads}>
          <ul className="text-sm">
            {downloads.map((x) => (
              <li key={x.id} className="text-ink-soft">
                {when(x.created_at)} · {x.transaction_id.slice(0, 8)}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
