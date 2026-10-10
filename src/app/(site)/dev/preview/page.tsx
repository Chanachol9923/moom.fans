import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { PRESETS } from "@/lib/pets/sprites";
import { PageDesigner } from "../../dashboard/page/PageDesigner";
import { PetsManager } from "../../dashboard/pets/PetsManager";
import { sampleStore } from "@/lib/sample-store";
import { StoreView } from "../../s/[slug]/StoreView";
import { PayClient } from "../../s/[slug]/pay/[token]/PayClient";

// Development-only gallery of screens with sample data, for working on UI
// without a database. Returns 404 in production builds.

function minutesFromNow(m: number) {
  return new Date(Date.now() + m * 60_000).toISOString();
}

const VIEWS = ["store", "designer", "pay-waiting", "pay-pending", "pay-done", "pets"] as const;

export default async function Preview({ searchParams }: PageProps<"/dev/preview">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { d, locale } = await getT();
  const view = ((await searchParams).view as string) ?? "store";

  const sp = await searchParams;
  // ?theme=night&unit=1&bg=grid lets the gallery show page-design variants.
  const store = sampleStore(locale, {
    theme: sp.theme,
    background: sp.bg,
    unit: sp.unit ? { enabled: true, name: locale === "th" ? "ข้าวโพด" : "corn", price: 20, icon: "corn", presets: [1, 3, 5, 10] } : undefined,
  });

  const pay = (status: "awaiting_payment" | "pending_review" | "verified", kind: "tip" | "purchase" = "tip") => ({
    status,
    kind,
    amount: 50,
    supporterName: "sparrow",
    productTitle: kind === "purchase" ? store.products[0].title : null,
    expiresAt: minutesFromNow(29),
    slipDeadline: minutesFromNow(89),
    canDownload: kind === "purchase" && status === "verified",
  });

  return (
    <div>
      <nav className="flex flex-wrap gap-2 bg-ink px-4 py-2 font-display text-sm text-paper">
        <span className="opacity-60">dev preview:</span>
        {VIEWS.map((v) => (
          <Link key={v} href={`?view=${v}`} className={v === view ? "underline" : "opacity-80"}>
            {v}
          </Link>
        ))}
      </nav>
      {view === "store" && <StoreView store={store} d={d} locale={locale} />}
      {view === "designer" && (
        <main className="mx-auto max-w-7xl p-4">
          <PageDesigner
            store={store}
            initial={store.page}
            pets={[{ id: "00000000-0000-0000-0000-00000000000a", name: "Mikan", sprite: PRESETS.cat }]}
            userId="dev"
            supabase={{ url: "http://127.0.0.1:54321", key: "dev" }}
          />
        </main>
      )}
      {view === "pay-waiting" && (
        <div style={{ ["--accent" as string]: store.accent }}>
          <PayClient token="preview-token-000000" initial={pay("awaiting_payment")} streamerName={store.displayName} />
        </div>
      )}
      {view === "pay-pending" && <PayClient token="preview-token-000000" initial={pay("pending_review")} streamerName={store.displayName} />}
      {view === "pay-done" && (
        <PayClient token="preview-token-000000" initial={pay("verified", "purchase")} streamerName={store.displayName} />
      )}
      {view === "pets" && (
        <main className="mx-auto max-w-5xl p-4">
          <PetsManager
            pets={[
              {
                id: "00000000-0000-0000-0000-00000000000a",
                streamer_id: "x",
                name: "นกน้อย",
                species: "bird",
                palette: {},
                sprite: null,
                chatter: "noknoi",
                is_active: true,
                created_at: "",
                resolved: PRESETS.bird,
              },
              {
                id: "00000000-0000-0000-0000-00000000000b",
                streamer_id: "x",
                name: "ส้มจี๊ด",
                species: "cat",
                palette: {},
                sprite: null,
                chatter: null,
                is_active: false,
                created_at: "",
                resolved: PRESETS.cat,
              },
            ]}
          />
        </main>
      )}
    </div>
  );
}
