import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/hosts";
import { createClient } from "@/lib/supabase/server";

// Clears a session whose account no longer exists (deleted elsewhere), then sends the
// browser to sign in. Only ever signs out a dead session, so a stray link to this URL
// can't log anyone out of a working account.
export async function GET() {
  const supabase = await createClient();
  const { error } = await supabase.auth.getUser();
  if (error && isGone(error)) await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(siteUrl("/login"));
}

function isGone(error: { status?: number; code?: string }) {
  return error.code === "user_not_found" || error.status === 403 || error.status === 404;
}
