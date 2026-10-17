"use server";
// Dashboard actions for page design, goals, polls, wheel, subathon, alert queue
// and account. Same rule as actions.ts: authorise first, touch only own rows.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { streamerForAction } from "@/lib/auth";
import { replayAlert } from "@/lib/domain/alerts";
import { PageConfigSchema } from "@/lib/page-config";
import { notifyOverlay } from "@/lib/realtime";
import { BUCKETS } from "@/lib/storage";
import { removeObjects } from "@/lib/storage.server";
import { admin } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { WheelSchema } from "@moom/shared/wheel";

const SAFE_PATH = /^[\w\-./]+$/;

async function channelOf(streamerId: string) {
  const { data } = await admin().from("streamer_private").select("overlay_channel").eq("streamer_id", streamerId).single();
  return data!.overlay_channel;
}

// ---------------------------------------------------------------------------
// page design

export async function savePageConfig(raw: unknown): Promise<{ ok: boolean }> {
  const { supabase, profile } = await streamerForAction();
  const cfg = PageConfigSchema.parse(raw ?? {});
  if (cfg.backgroundImagePath && !(cfg.backgroundImagePath.startsWith(`${profile.id}/`) && SAFE_PATH.test(cfg.backgroundImagePath))) {
    cfg.backgroundImagePath = null;
  }
  if (cfg.petId) {
    const { data: pet } = await supabase.from("pets").select("id").eq("id", cfg.petId).maybeSingle();
    if (!pet) cfg.petId = null;
  }
  const { error } = await supabase.from("profiles").update({ page: cfg as unknown as Json }).eq("id", profile.id);
  revalidatePath("/dashboard/page");
  return { ok: !error };
}

// ---------------------------------------------------------------------------
// goals

const GoalInput = z.object({
  title: z.string().trim().min(1).max(80),
  target: z.coerce.number().positive().max(100_000_000),
  starting: z.coerce.number().min(0).max(100_000_000).default(0),
  endsAt: z.string().optional(),
  includePurchases: z.coerce.boolean().default(false),
});

export async function createGoal(_prev: { ok: boolean; error?: string }, form: FormData) {
  const { supabase, profile } = await streamerForAction();
  const v = GoalInput.safeParse({
    title: form.get("title"),
    target: form.get("target"),
    starting: form.get("starting") || 0,
    endsAt: String(form.get("endsAt") ?? "") || undefined,
    includePurchases: form.get("includePurchases") === "on",
  });
  if (!v.success) return { ok: false, error: v.error.issues[0]?.path.join(".") };
  // date input gives yyyy-mm-dd; treat as end of that day in Bangkok
  const ends = v.data.endsAt && /^\d{4}-\d{2}-\d{2}$/.test(v.data.endsAt) ? `${v.data.endsAt}T23:59:59+07:00` : null;
  await supabase.from("goals").update({ is_active: false }).eq("streamer_id", profile.id).eq("is_active", true);
  const { error } = await supabase.from("goals").insert({
    streamer_id: profile.id,
    title: v.data.title,
    target_amount: v.data.target,
    starting_amount: v.data.starting,
    include_purchases: v.data.includePurchases,
    ends_at: ends,
  });
  if (error) return { ok: false, error: error.message };
  await notifyOverlay(await channelOf(profile.id), { type: "config" });
  revalidatePath("/dashboard/goals");
  return { ok: true };
}

export async function endGoal(goalId: string) {
  const { supabase, profile } = await streamerForAction();
  await supabase.from("goals").update({ is_active: false }).eq("id", z.uuid().parse(goalId)).eq("streamer_id", profile.id);
  await notifyOverlay(await channelOf(profile.id), { type: "config" });
  revalidatePath("/dashboard/goals");
}

export async function deleteGoal(goalId: string) {
  const { supabase, profile } = await streamerForAction();
  await supabase.from("goals").delete().eq("id", z.uuid().parse(goalId)).eq("streamer_id", profile.id);
  revalidatePath("/dashboard/goals");
}

// ---------------------------------------------------------------------------
// polls

export async function startPoll(_prev: { ok: boolean; error?: string }, form: FormData) {
  const { supabase, profile } = await streamerForAction();
  const title = z.string().trim().min(1).max(100).safeParse(form.get("title"));
  const options = String(form.get("options") ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 10);
  const weightBy = form.get("weightBy") === "count" ? "count" : "amount";
  if (!title.success || options.length < 2) return { ok: false, error: "invalid" };
  await supabase.from("polls").update({ is_active: false, closed_at: new Date().toISOString() }).eq("streamer_id", profile.id).eq("is_active", true);
  const { error } = await supabase
    .from("polls")
    .insert({ streamer_id: profile.id, title: title.data, options, weight_by: weightBy });
  if (error) return { ok: false, error: error.message };
  await notifyOverlay(await channelOf(profile.id), { type: "config" });
  revalidatePath("/dashboard/fun");
  return { ok: true };
}

export async function closePoll(pollId: string) {
  const { supabase, profile } = await streamerForAction();
  await supabase
    .from("polls")
    .update({ is_active: false, closed_at: new Date().toISOString() })
    .eq("id", z.uuid().parse(pollId))
    .eq("streamer_id", profile.id);
  await notifyOverlay(await channelOf(profile.id), { type: "config" });
  revalidatePath("/dashboard/fun");
}

// ---------------------------------------------------------------------------
// wheel & subathon

export async function saveWheel(raw: unknown) {
  const { supabase, profile } = await streamerForAction();
  const cfg = WheelSchema.parse(raw ?? {});
  await supabase.from("overlay_settings").update({ wheel: cfg as unknown as Json }).eq("streamer_id", profile.id);
  revalidatePath("/dashboard/fun");
}

/** Subathon controls are cross-row arithmetic on a timestamp, so they run server-side with checks. */
export async function subathonControl(action: "start" | "add" | "pause" | "resume" | "stop", minutes = 0, rate?: number) {
  const { profile } = await streamerForAction();
  const db = admin();
  const { data: s } = await db
    .from("overlay_settings")
    .select("subathon_ends_at, subathon_paused_left")
    .eq("streamer_id", profile.id)
    .single();
  if (!s) return;
  const now = Date.now();
  const secs = Math.max(0, Math.min(7 * 24 * 3600, Math.round(minutes * 60)));
  const left = s.subathon_ends_at ? Math.max(0, Math.round((new Date(s.subathon_ends_at).getTime() - now) / 1000)) : 0;
  const at = (seconds: number) => new Date(now + seconds * 1000).toISOString();
  let patch: { subathon_ends_at?: string | null; subathon_paused_left?: number | null; subathon_seconds_per_baht?: number } = {};
  switch (action) {
    case "start":
      patch = { subathon_ends_at: at(secs), subathon_paused_left: null };
      break;
    case "add":
      if (s.subathon_paused_left !== null) patch = { subathon_paused_left: s.subathon_paused_left + secs };
      else if (left > 0) patch = { subathon_ends_at: at(left + secs) };
      break;
    case "pause":
      if (left > 0) patch = { subathon_ends_at: null, subathon_paused_left: left };
      break;
    case "resume":
      if (s.subathon_paused_left !== null) patch = { subathon_ends_at: at(s.subathon_paused_left), subathon_paused_left: null };
      break;
    case "stop":
      patch = { subathon_ends_at: null, subathon_paused_left: null };
      break;
  }
  if (rate !== undefined && Number.isFinite(rate)) patch.subathon_seconds_per_baht = Math.max(0, Math.min(3600, rate));
  if (Object.keys(patch).length) await db.from("overlay_settings").update(patch).eq("streamer_id", profile.id);
  await notifyOverlay(await channelOf(profile.id), { type: "config" });
  revalidatePath("/dashboard/fun");
}

// ---------------------------------------------------------------------------
// alert queue control

export async function replay(alertId: string) {
  const { profile } = await streamerForAction();
  await replayAlert(profile.id, z.uuid().parse(alertId));
  revalidatePath("/dashboard/overlay");
}

export async function removeQueued(alertId: string) {
  const { profile } = await streamerForAction();
  await admin()
    .from("alerts")
    .update({ status: "skipped", finished_at: new Date().toISOString() })
    .eq("id", z.uuid().parse(alertId))
    .eq("streamer_id", profile.id)
    .in("status", ["queued", "held"]);
  revalidatePath("/dashboard/overlay");
}

// ---------------------------------------------------------------------------
// account

/** PDPA: permanently delete the account, every row (FK cascades) and stored files. */
export async function deleteAccount(confirmSlug: string): Promise<{ ok: false }> {
  const { user, profile } = await streamerForAction();
  if (confirmSlug.trim().toLowerCase() !== profile.slug) return { ok: false };
  const db = admin();
  for (const bucket of [BUCKETS.publicMedia, BUCKETS.productFiles, BUCKETS.slips]) {
    const paths = await listAll(bucket, profile.id);
    for (let i = 0; i < paths.length; i += 100) await removeObjects(bucket, paths.slice(i, i + 100));
  }
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("account delete failed", error.message);
    return { ok: false };
  }
  redirect("/");
}

async function listAll(bucket: string, prefix: string, depth = 0): Promise<string[]> {
  if (depth > 3) return [];
  const { data } = await admin().storage.from(bucket).list(prefix, { limit: 1000 });
  const out: string[] = [];
  for (const item of data ?? []) {
    const path = `${prefix}/${item.name}`;
    // folders come back without an id
    if (item.id) out.push(path);
    else out.push(...(await listAll(bucket, path, depth + 1)));
  }
  return out;
}
