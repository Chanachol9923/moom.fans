import { Panel } from "@/components/ui";
import { requireStreamer } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { getT } from "@/lib/i18n/server";
import { publicMediaUrl } from "@/lib/storage";
import { NewProduct, ProductEditor } from "./ProductEditor";

export default async function ProductsPage() {
  const { supabase, profile, user } = await requireStreamer();
  const { d } = await getT();
  const [{ data: products }, { data: sold }] = await Promise.all([
    supabase.from("products").select("*").order("sort_order").order("created_at"),
    supabase.from("transactions").select("product_id").eq("kind", "purchase").eq("status", "verified").limit(10_000),
  ]);
  const soldCount = new Map<string, number>();
  for (const s of sold ?? []) if (s.product_id) soldCount.set(s.product_id, (soldCount.get(s.product_id) ?? 0) + 1);
  const sb = { url: publicEnv.supabaseUrl(), key: publicEnv.supabaseKey() };

  return (
    <div className="grid gap-5">
      <h1 className="text-3xl">{d.products.title}</h1>
      <NewProduct />
      {products?.length ? (
        products.map((p) => (
          <ProductEditor
            key={p.id}
            product={p}
            coverUrl={publicMediaUrl(p.cover_path)}
            previewUrl={publicMediaUrl(p.preview_audio_path)}
            sold={soldCount.get(p.id) ?? 0}
            userId={user.id}
            supabase={sb}
            accent={profile.accent_color}
          />
        ))
      ) : (
        <Panel>
          <p className="text-ink-soft">{d.products.empty}</p>
        </Panel>
      )}
    </div>
  );
}
