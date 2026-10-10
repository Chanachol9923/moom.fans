import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";

// PDPA data export: everything the signed-in streamer owns, read through RLS.
export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tables = [
    "profiles",
    "streamer_private",
    "overlay_settings",
    "products",
    "transactions",
    "downloads",
    "alerts",
    "pets",
    "goals",
    "polls",
  ] as const;
  const out: Record<string, unknown> = { exported_at: new Date().toISOString(), user: { id: user.id, email: user.email } };
  for (const t of tables) {
    const { data } = await supabase.from(t).select("*").limit(50_000);
    out[t] = data ?? [];
  }
  // Public tables (goals/polls/products/profiles) are readable by everyone; keep only ours.
  for (const t of ["goals", "polls", "products"] as const) {
    out[t] = (out[t] as Array<{ streamer_id: string }>).filter((r) => r.streamer_id === user.id);
  }
  out.profiles = (out.profiles as Array<{ id: string }>).filter((r) => r.id === user.id);
  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="moom-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
