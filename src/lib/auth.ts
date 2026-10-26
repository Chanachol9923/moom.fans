import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/hosts";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { getUser } from "@/lib/supabase/server";

/**
 * For dashboard pages: signed in *and* onboarded, or redirect.
 * cache(): the dashboard layout and the page both call this; one profile query per request.
 */
export const requireStreamer = cache(async function requireStreamer() {
  if (!isSupabaseConfigured()) redirect("/login");
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/onboarding");
  return { supabase, user, profile };
});

/**
 * For server actions. A session can expire, or the account be deleted, while the
 * dashboard is open; then the action sends the browser to sign in (and back to the
 * same page afterwards) instead of failing with an error screen.
 * Call it outside any try/catch: redirect() works by throwing.
 */
export async function streamerForAction() {
  const { supabase, user } = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(await currentPath())}`);
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/onboarding");
  return { supabase, user, profile };
}

/** The dashboard page the action came from, if it's one we'd send people back to. */
async function currentPath(): Promise<string> {
  const ref = (await headers()).get("referer");
  try {
    return (ref && safeNext(new URL(ref).pathname)) || "/dashboard";
  } catch {
    return "/dashboard";
  }
}
