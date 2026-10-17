"use server";
import { CHALLENGE_RE, createAppLink } from "@/lib/domain/app-link";
import { getUser } from "@/lib/supabase/server";

/** The signed-in streamer approved the desktop app. Returns the one-time code for it. */
export async function approveAppLink(challenge: string, deviceName: string): Promise<{ code: string } | { error: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "signed_out" };
  if (!CHALLENGE_RE.test(challenge)) return { error: "invalid" };
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (!profile) return { error: "not_onboarded" };
  return { code: await createAppLink(user.id, challenge, deviceName) };
}
