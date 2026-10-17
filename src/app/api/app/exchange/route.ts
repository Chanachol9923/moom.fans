import { NextResponse, type NextRequest } from "next/server";
import { exchangeAppLink } from "@/lib/domain/app-link";
import { clientIp, rateLimit } from "@/lib/ratelimit";

// Called by the desktop app (a different origin, no cookies), so CORS is open.
// Safe because the code is single-use, short-lived and bound to the app's PKCE verifier.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "600",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: NextRequest) {
  if (!rateLimit(`app-exchange:${clientIp(request)}`, 10, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: CORS });
  }
  const body = (await request.json().catch(() => null)) as { code?: unknown; verifier?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const verifier = typeof body?.verifier === "string" ? body.verifier : "";
  const r = await exchangeAppLink(code, verifier);
  if (!r.ok) {
    const status = r.error === "server" ? 500 : 400;
    return NextResponse.json({ error: r.error }, { status, headers: { ...CORS, "Cache-Control": "no-store" } });
  }
  return NextResponse.json(
    { token_hash: r.tokenHash, email: r.email },
    { headers: { ...CORS, "Cache-Control": "no-store" } },
  );
}
