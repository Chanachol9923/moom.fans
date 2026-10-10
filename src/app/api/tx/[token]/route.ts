import { NextResponse } from "next/server";
import { payView } from "@/lib/domain/pay-view";
import { getTransactionByToken } from "@/lib/domain/transactions";

// Polled by the pay page while waiting for confirmation.
export async function GET(_req: Request, ctx: RouteContext<"/api/tx/[token]">) {
  const { token } = await ctx.params;
  const tx = await getTransactionByToken(token);
  if (!tx) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(payView(tx), { headers: { "Cache-Control": "no-store" } });
}
