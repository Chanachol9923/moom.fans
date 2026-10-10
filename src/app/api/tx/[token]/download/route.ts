import { NextResponse } from "next/server";
import { getTransactionByToken, publicStatus } from "@/lib/domain/transactions";
import { siteUrl } from "@/lib/hosts";
import { BUCKETS } from "@/lib/storage";
import { signedDownloadUrl } from "@/lib/storage.server";
import { admin } from "@/lib/supabase/admin";

const LINK_TTL_SECONDS = 15 * 60;

// Buyer clicks Download: check the purchase, log it, redirect to a 15-minute signed URL.
// The buyer can come back to the pay page any time for a fresh link.
export async function GET(_req: Request, ctx: RouteContext<"/api/tx/[token]/download">) {
  const { token } = await ctx.params;
  const tx = await getTransactionByToken(token);
  if (!tx || tx.kind !== "purchase" || publicStatus(tx) !== "verified" || !tx.product_id) {
    return NextResponse.redirect(siteUrl("/"), 303);
  }
  const db = admin();
  const { data: product } = await db
    .from("products")
    .select("file_path, file_name")
    .eq("id", tx.product_id)
    .maybeSingle();
  if (!product?.file_path) return new NextResponse("File no longer available", { status: 410 });

  const url = await signedDownloadUrl(
    BUCKETS.productFiles,
    product.file_path,
    LINK_TTL_SECONDS,
    product.file_name ?? undefined,
  );
  await Promise.all([
    db.from("downloads").insert({ transaction_id: tx.id, streamer_id: tx.streamer_id }),
    db.from("transactions").update({ download_count: tx.download_count + 1 }).eq("id", tx.id),
  ]);
  return NextResponse.redirect(url, 303);
}
