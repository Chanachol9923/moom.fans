import QRCode from "qrcode";
import { getTransactionByToken, publicStatus } from "@/lib/domain/transactions";
import { promptPayPayload } from "@/lib/promptpay";
import { admin } from "@/lib/supabase/admin";

// PromptPay QR for one payment, rendered server-side so the payout id never
// travels to the browser as plain JSON (it is, unavoidably, inside the QR).
export async function GET(request: Request, ctx: RouteContext<"/api/tx/[token]/qr">) {
  const { token } = await ctx.params;
  const tx = await getTransactionByToken(token);
  if (!tx || publicStatus(tx) !== "awaiting_payment") return new Response("gone", { status: 410 });
  const { data: priv } = await admin()
    .from("streamer_private")
    .select("promptpay_type, promptpay_id")
    .eq("streamer_id", tx.streamer_id)
    .single();
  if (!priv) return new Response("not found", { status: 404 });

  const payload = promptPayPayload({ type: priv.promptpay_type, id: priv.promptpay_id, amount: Number(tx.amount) });
  const format = new URL(request.url).searchParams.get("format");
  const opts = { errorCorrectionLevel: "M" as const, margin: 2, color: { dark: "#241e19", light: "#ffffff" } };

  if (format === "png") {
    const png = await QRCode.toBuffer(payload, { ...opts, type: "png", width: 720 });
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="promptpay-${Number(tx.amount).toFixed(2)}.png"`,
        "Cache-Control": "private, no-store",
      },
    });
  }
  const svg = await QRCode.toString(payload, { ...opts, type: "svg" });
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "private, no-store" } });
}
