import { NextResponse } from "next/server";
import { z } from "zod";
import { streamerByOverlayToken } from "@/lib/domain/overlay";
import { admin } from "@/lib/supabase/admin";

// start: queued -> playing. Only the first overlay to ask gets `ok: true`, so two OBS
// scenes (or a preview tab) never play the same alert twice.
// done / skipped: playing -> finished.
export async function POST(_req: Request, ctx: RouteContext<"/api/overlay/[token]/alerts/[id]/[step]">) {
  const { token, id, step } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ ok: false }, { status: 400 });
  const s = await streamerByOverlayToken(token);
  if (!s) return NextResponse.json({ ok: false }, { status: 404 });
  const db = admin();
  const now = new Date().toISOString();

  if (step === "start") {
    const { data } = await db
      .from("alerts")
      .update({ status: "playing", started_at: now })
      .eq("id", id)
      .eq("streamer_id", s.streamer_id)
      .eq("status", "queued")
      .select("id")
      .maybeSingle();
    return NextResponse.json({ ok: Boolean(data) });
  }
  if (step === "done" || step === "skipped") {
    await db
      .from("alerts")
      .update({ status: step, finished_at: now })
      .eq("id", id)
      .eq("streamer_id", s.streamer_id)
      .in("status", ["playing", "queued"]);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false }, { status: 404 });
}
