import { NextResponse, type NextRequest } from "next/server";
import { submitSlip, TxError } from "@/lib/domain/transactions";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/tx/[token]/slip">) {
  const { token } = await ctx.params;
  if (!rateLimit(`slip:${clientIp(request)}`, 10, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get("slip");
  if (!(file instanceof File)) return NextResponse.json({ error: "bad_file" }, { status: 400 });
  try {
    const status = await submitSlip(token, file);
    return NextResponse.json({ status });
  } catch (e) {
    if (e instanceof TxError) {
      return NextResponse.json({ error: e.code }, { status: e.code === "not_found" ? 404 : 400 });
    }
    console.error("slip upload failed", e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
