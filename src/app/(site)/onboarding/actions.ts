"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isValidSlug } from "@/lib/hosts";
import { detectPromptPayType, isValidNationalId, normalizePromptPayId } from "@/lib/promptpay";
import { admin } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/server";
import { newToken } from "@/lib/tokens";

export type OnboardingState = {
  errors?: Partial<Record<"slug" | "displayName" | "promptpay" | "form", "invalid" | "taken" | "error">>;
  values?: { slug: string; displayName: string; promptpay: string };
};

const Input = z.object({
  slug: z.string().trim().toLowerCase(),
  displayName: z.string().trim().min(1).max(60),
  promptpay: z.string().trim(),
});

export async function createCorner(_prev: OnboardingState, form: FormData): Promise<OnboardingState> {
  const { user } = await getUser();
  if (!user) redirect("/login");

  const raw = {
    slug: String(form.get("slug") ?? ""),
    displayName: String(form.get("displayName") ?? ""),
    promptpay: String(form.get("promptpay") ?? ""),
  };
  const parsed = Input.safeParse(raw);
  const errors: OnboardingState["errors"] = {};
  if (!parsed.success) errors.form = "invalid";
  const v = parsed.success ? parsed.data : { ...raw, slug: raw.slug.toLowerCase() };

  if (!isValidSlug(v.slug)) errors.slug = "invalid";
  if (!v.displayName) errors.displayName = "invalid";
  const ppId = normalizePromptPayId(v.promptpay);
  const ppType = detectPromptPayType(ppId);
  if (!ppType || (ppType === "national_id" && !isValidNationalId(ppId))) errors.promptpay = "invalid";
  if (Object.keys(errors).length) return { errors, values: raw };

  const db = admin();
  const { data: existing } = await db.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (existing) redirect("/dashboard");

  // Three rows that only make sense together; roll back by hand if a later one fails.
  const { error: pErr } = await db
    .from("profiles")
    .insert({ id: user.id, slug: v.slug, display_name: v.displayName });
  if (pErr) {
    return { errors: pErr.code === "23505" ? { slug: "taken" } : { form: "error" }, values: raw };
  }
  const { error: sErr } = await db.from("streamer_private").insert({
    streamer_id: user.id,
    promptpay_type: ppType!,
    promptpay_id: ppId,
    overlay_token: newToken(),
    control_token: newToken(),
    overlay_channel: newToken(12),
  });
  const { error: oErr } = sErr ? { error: sErr } : await db.from("overlay_settings").insert({ streamer_id: user.id });
  if (sErr || oErr) {
    await db.from("profiles").delete().eq("id", user.id);
    console.error("onboarding failed", sErr ?? oErr);
    return { errors: { form: "error" }, values: raw };
  }
  redirect("/dashboard");
}
