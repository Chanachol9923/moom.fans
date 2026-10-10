import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { publicEnv } from "@/lib/env";

// Daily database ping so a free-tier Supabase project is never paused for inactivity.
// Runs a real read (not just an HTTP hit) through the public API with the publishable key.
// Scheduled by vercel.json; if CRON_SECRET is set, Vercel sends it as a Bearer token.
// Not needed on a paid Supabase plan, which is never paused.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const sb = createClient(publicEnv.supabaseUrl(), publicEnv.supabaseKey(), { auth: { persistSession: false } });
  const { error } = await sb.from("profiles").select("id").limit(1);
  if (error) {
    console.error("keepalive failed", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true, at: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
