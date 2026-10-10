import { NextResponse } from "next/server";
import { loadOverlayState } from "@/lib/domain/overlay";

export async function GET(_req: Request, ctx: RouteContext<"/api/overlay/[token]/state">) {
  const { token } = await ctx.params;
  const state = await loadOverlayState(token);
  if (!state) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
}
