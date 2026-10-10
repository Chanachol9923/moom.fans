"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { enabledProviders } from "@/lib/auth-providers";
import { siteUrl } from "@/lib/hosts";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { status: "idle" | "sent" | "error"; email?: string };

export async function sendMagicLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = z.email().safeParse(String(form.get("email") ?? "").trim());
  if (!email.success) return { status: "error" };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: siteUrl("/auth/callback"), shouldCreateUser: true },
  });
  if (error) {
    console.warn("auth: magic link failed", error.message);
    return { status: "error", email: email.data };
  }
  return { status: "sent", email: email.data };
}

export async function signInWithProvider(form: FormData) {
  const provider = form.get("provider");
  const on = await enabledProviders();
  const allowed = (provider === "discord" && on.discord) || (provider === "google" && on.google);
  if (!allowed) redirect("/login?error=provider");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as "discord" | "google",
    options: { redirectTo: siteUrl("/auth/callback") },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
