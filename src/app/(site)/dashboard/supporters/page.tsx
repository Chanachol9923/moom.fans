import { Panel } from "@/components/ui";
import { requireStreamer } from "@/lib/auth";
import { formatBaht } from "@moom/shared/i18n";
import { getT } from "@/lib/i18n/server";

type Row = { name: string; email: string | null; total: number; count: number; last: string };

export default async function SupportersPage() {
  const { supabase } = await requireStreamer();
  const { d, locale } = await getT();
  const { data } = await supabase
    .from("transactions")
    .select("supporter_name, supporter_email, amount, verified_at, is_anonymous")
    .eq("status", "verified")
    .order("verified_at", { ascending: false })
    .limit(20_000);

  const byName = new Map<string, Row>();
  for (const t of data ?? []) {
    if (t.is_anonymous) continue;
    const key = t.supporter_name.trim().toLowerCase();
    if (!key || key === "-") continue;
    const r = byName.get(key) ?? { name: t.supporter_name.trim(), email: null, total: 0, count: 0, last: t.verified_at ?? "" };
    r.total = Math.round((r.total + Number(t.amount)) * 100) / 100;
    r.count += 1;
    r.email ??= t.supporter_email;
    byName.set(key, r);
  }
  const rows = [...byName.values()].sort((a, b) => b.total - a.total);
  const when = (iso: string) =>
    iso ? new Date(iso).toLocaleDateString(locale === "th" ? "th-TH" : "en-GB", { dateStyle: "short", timeZone: "Asia/Bangkok" }) : "";

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-3xl">{d.supporters.title}</h1>
        <p className="mt-1 text-ink-soft">{d.supporters.subtitle}</p>
      </div>
      <Panel>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="font-display text-ink-soft">
                <tr>
                  <th className="py-1 pr-3">#</th>
                  <th className="py-1 pr-3">{d.supporters.name}</th>
                  <th className="py-1 pr-3">{d.supporters.total}</th>
                  <th className="py-1 pr-3">{d.supporters.count}</th>
                  <th className="py-1">{d.supporters.last}</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-dashed divide-ink/10">
                {rows.map((r, i) => (
                  <tr key={r.name + i}>
                    <td className="font-num py-2 pr-3 text-ink-faint">{i + 1}</td>
                    <td className="py-2 pr-3">
                      {r.name}
                      {r.email && <div className="text-xs text-ink-faint">{r.email}</div>}
                    </td>
                    <td className="font-num py-2 pr-3">{formatBaht(r.total, locale)}</td>
                    <td className="font-num py-2 pr-3">{r.count}</td>
                    <td className="py-2 text-ink-faint">{when(r.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-ink-soft">{d.supporters.none}</p>
        )}
      </Panel>
    </div>
  );
}
