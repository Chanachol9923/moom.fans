import { NextResponse, type NextRequest } from "next/server";
import { createTransaction, CreateTxInput, TxError } from "@/lib/domain/transactions";
import { clientIp, rateLimit } from "@/lib/ratelimit";

// Supporter starts a tip or purchase. Returns the capability token for the pay page.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/public/[slug]/tx">) {
  const { slug } = await ctx.params;
  if (!rateLimit(`tx:${clientIp(request)}`, 12, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  // Honeypot: real people never fill a hidden field.
  if (body && typeof body === "object" && "website" in body && body.website) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const input = CreateTxInput.safeParse(body);
  if (!input.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    const token = await createTransaction(slug, input.data);
    return NextResponse.json({ token });
  } catch (e) {
    if (e instanceof TxError) {
      return NextResponse.json({ error: e.code }, { status: e.code === "not_found" ? 404 : 400 });
    }
    console.error("tx create failed", e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
