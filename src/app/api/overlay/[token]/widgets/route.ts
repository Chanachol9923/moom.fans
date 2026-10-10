import { NextResponse } from "next/server";
import { loadWidgetData } from "@/lib/domain/widgets";

export async function GET(_req: Request, ctx: RouteContext<"/api/overlay/[token]/widgets">) {
  const { token } = await ctx.params;
  const data = await loadWidgetData(token);
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
