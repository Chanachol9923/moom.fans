import "server-only";
import { redirect } from "next/navigation";
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

/** For server actions: same check, but throws instead of redirecting mid-action. */
export async function streamerForAction() {
  const { supabase, user } = await getUser();
  if (!user) throw new Error("not signed in");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) throw new Error("not onboarded");
  return { supabase, user, profile };
}
