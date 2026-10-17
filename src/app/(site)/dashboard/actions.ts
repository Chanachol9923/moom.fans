"use server";
// Dashboard mutations. Every action starts with streamerForAction() and only ever
// touches rows belonging to that streamer, even when it uses the service-role client.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { VtsRule } from "@moom/shared/alerts";
import { streamerForAction } from "@/lib/auth";
import { queueTestAlert } from "@/lib/domain/alerts";
import { rejectTransaction, verifyTransaction } from "@/lib/domain/transactions";
import { getDict, isLocale } from "@moom/shared/i18n";
import { notifyOverlay } from "@/lib/realtime";
import { isSlipOkConfigured } from "@/lib/slipok";
import { BUCKETS } from "@/lib/storage";
import { removeObjects, signedUploadUrl } from "@/lib/storage.server";
import { admin } from "@/lib/supabase/admin";
import type { Json, OverlayPosition } from "@/lib/supabase/database.types";
import { newToken } from "@/lib/tokens";
import { detectPromptPayType, isValidNationalId, normalizePromptPayId } from "@/lib/promptpay";
import { isTtsVoice } from "@/lib/tts/types";
import { isPetSprite, isPresetSpecies, MAX_PETS } from "@moom/shared/pets/sprites";

/** Storage keys we generate only ever contain these characters. */
const SAFE_PATH = /^[\w\-./]+$/;

async function ownTransaction(txId: string) {
  const { profile } = await streamerForAction();
  const { data } = await admin()
    .from("transactions")
    .select("id, streamer_id")
    .eq("id", txId)
    .eq("streamer_id", profile.id)
    .maybeSingle();
  if (!data) throw new Error("not found");
  return { profile, tx: data };
}

async function channelOf(streamerId: string) {
  const { data } = await admin().from("streamer_private").select("overlay_channel").eq("streamer_id", streamerId).single();
  return data!.overlay_channel;
}

// ---------------------------------------------------------------------------
// review queue

export async function approvePayment(txId: string) {
  const { tx } = await ownTransaction(z.uuid().parse(txId));
  await verifyTransaction(tx.id, "manual");
  revalidatePath("/dashboard", "layout");
}

export async function rejectPayment(txId: string) {
  const { tx } = await ownTransaction(z.uuid().parse(txId));
  await rejectTransaction(tx.id);
  revalidatePath("/dashboard", "layout");
}

export async function releaseHeldAlert(alertId: string, withMedia: boolean) {
  const { profile } = await streamerForAction();
  const id = z.uuid().parse(alertId);
  const db = admin();
  const { data: alert } = await db
    .from("alerts")
    .select("id, payload")
    .eq("id", id)
    .eq("streamer_id", profile.id)
    .eq("status", "held")
    .maybeSingle();
  if (!alert) return;
  const payload = withMedia ? alert.payload : { ...(alert.payload as object), media: null };
  await db.from("alerts").update({ status: "queued", payload }).eq("id", id).eq("status", "held");
  await notifyOverlay(await channelOf(profile.id), { type: "alerts" });
  revalidatePath("/dashboard", "layout");
}

export async function skipHeldAlert(alertId: string) {
  const { profile } = await streamerForAction();
  await admin()
    .from("alerts")
    .update({ status: "skipped", finished_at: new Date().toISOString() })
    .eq("id", z.uuid().parse(alertId))
    .eq("streamer_id", profile.id)
    .eq("status", "held");
  revalidatePath("/dashboard", "layout");
}

// ---------------------------------------------------------------------------
// overlay controls

export async function sendControl(action: "panic" | "skip" | "resume") {
  const { profile } = await streamerForAction();
  const a = z.enum(["panic", "skip", "resume"]).parse(action);
  await notifyOverlay(await channelOf(profile.id), { type: "control", action: a });
}

export async function sendTestAlert(kind: "tip" | "purchase" | "media" | "unit" | "wheel") {
  const { profile } = await streamerForAction();
  const d = getDict(profile.locale);
  const k = z.enum(["tip", "purchase", "media", "unit", "wheel"]).parse(kind);
  await queueTestAlert(profile.id, {
    kind: k === "purchase" ? "purchase" : "tip",
    name: d.alert.testName,
    amount: k === "purchase" ? 149 : 100,
    message: d.alert.testMessage,
    productTitle: k === "purchase" ? d.alert.testProduct : undefined,
    // A short, embeddable Creative Commons clip (Big Buck Bunny trailer).
    mediaUrl: k === "media" ? "https://www.youtube.com/watch?v=aqz-KE-bpKQ" : undefined,
    unitQty: k === "unit" ? 3 : undefined,
    spin: k === "wheel",
  });
}

export async function rotateOverlayToken() {
  const { profile } = await streamerForAction();
  const db = admin();
  const { data: old } = await db.from("streamer_private").select("overlay_channel").eq("streamer_id", profile.id).single();
  await db
    .from("streamer_private")
    .update({ overlay_token: newToken(), control_token: newToken(), overlay_channel: newToken(12) })
    .eq("streamer_id", profile.id);
  // Old overlays reload, fail the token check and go blank.
  if (old) await notifyOverlay(old.overlay_channel, { type: "control", action: "reload" });
  revalidatePath("/dashboard", "layout");
}

const OverlaySettingsInput = z.object({
  position: z.enum(["top-left", "top-center", "top-right", "center", "bottom-left", "bottom-center", "bottom-right"]),
  alert_style: z.enum(["card", "compact", "banner"]),
  volume: z.coerce.number().int().min(0).max(100),
  display_seconds: z.coerce.number().int().min(3).max(60),
  min_alert_amount: z.coerce.number().min(0).max(100000),
  tts_enabled: z.coerce.boolean(),
  tts_voice: z.string().refine(isTtsVoice),
  tts_min_amount: z.coerce.number().min(0).max(100000),
  tts_max_chars: z.coerce.number().int().min(10).max(300),
  media_enabled: z.coerce.boolean(),
  media_baht_per_second: z.coerce.number().positive().max(1000),
  media_max_seconds: z.coerce.number().int().min(5).max(600),
  media_requires_approval: z.coerce.boolean(),
  pets_enabled: z.coerce.boolean(),
  twitch_channel: z
    .string()
    .trim()
    .toLowerCase()
    .transform((s) => (s === "" ? null : s))
    .refine((s) => s === null || /^[a-z0-9_]{3,25}$/.test(s)),
  blocked_words: z.string().max(5000),
  alert_sound_path: z.string().max(300).optional(),
});

export type SaveResult = { ok: boolean; error?: string };

export async function saveOverlaySettings(_prev: SaveResult, form: FormData): Promise<SaveResult> {
  const { supabase, profile } = await streamerForAction();
  const raw = Object.fromEntries(form);
  for (const k of ["tts_enabled", "media_enabled", "media_requires_approval", "pets_enabled"]) {
    raw[k] = form.get(k) === "on" ? "true" : "";
  }
  const parsed = OverlaySettingsInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.path.join(".") };
  const { blocked_words, alert_sound_path, ...settings } = parsed.data;
  const sound =
    alert_sound_path === undefined
      ? {}
      : {
          alert_sound_path:
            alert_sound_path.startsWith(`${profile.id}/`) && SAFE_PATH.test(alert_sound_path) ? alert_sound_path : null,
        };
  const { error } = await supabase
    .from("overlay_settings")
    .update({ ...settings, position: settings.position as OverlayPosition, ...sound })
    .eq("streamer_id", profile.id);
  if (error) return { ok: false, error: error.message };
  const words = blocked_words
    .split(/\r?\n/)
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, 300);
  await supabase.from("streamer_private").update({ blocked_words: words }).eq("streamer_id", profile.id);
  await notifyOverlay(await channelOf(profile.id), { type: "config" });
  revalidatePath("/dashboard/overlay");
  return { ok: true };
}

export async function saveVtsRules(enabled: boolean, rules: VtsRule[]) {
  const { supabase, profile } = await streamerForAction();
  const Rule = z.object({
    min_amount: z.number().min(0).max(1_000_000),
    kind: z.enum(["hotkey", "item"]),
    ref: z.string().min(1).max(200),
    label: z.string().max(80),
  });
  const clean = z.array(Rule).max(30).parse(rules);
  await supabase
    .from("overlay_settings")
    .update({ vts_enabled: Boolean(enabled), vts_rules: clean })
    .eq("streamer_id", profile.id);
  await notifyOverlay(await channelOf(profile.id), { type: "config" });
  revalidatePath("/dashboard/vts");
}

// ---------------------------------------------------------------------------
// profile & payout settings

const ProfileInput = z.object({
  display_name: z.string().trim().min(1).max(60),
  bio: z.string().trim().max(500),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  links: z.string().max(3000),
  tip_presets: z.string().max(100),
  min_tip: z.coerce.number().min(1).max(100000),
  locale: z.string().refine(isLocale),
  avatar_path: z.string().max(300).optional(),
  banner_path: z.string().max(300).optional(),
  promptpay: z.string().trim(),
  verify_mode: z.enum(["manual", "slipok"]),
});

export async function saveProfile(_prev: SaveResult, form: FormData): Promise<SaveResult> {
  const { supabase, profile } = await streamerForAction();
  const parsed = ProfileInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.path.join(".") };
  const v = parsed.data;

  const links = v.links
    .split(/\r?\n/)
    .map((line) => {
      const [label, url] = line.includes("|") ? line.split("|").map((s) => s.trim()) : ["", line.trim()];
      try {
        const u = new URL(url);
        if (u.protocol !== "https:" && u.protocol !== "http:") return null;
        return { label: (label || u.hostname.replace(/^www\./, "")).slice(0, 40), url: u.toString() };
      } catch {
        return null;
      }
    })
    .filter((x): x is { label: string; url: string } => x !== null)
    .slice(0, 12);
  const presets = [...new Set(v.tip_presets.split(/[,\s]+/).map(Number).filter((n) => Number.isInteger(n) && n > 0 && n <= 100000))]
    .sort((a, b) => a - b)
    .slice(0, 6);
  const own = (p: string | undefined) =>
    p === undefined ? undefined : p.startsWith(`${profile.id}/`) && SAFE_PATH.test(p) ? p : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: v.display_name,
      bio: v.bio,
      accent_color: v.accent_color,
      links,
      tip_presets: presets.length ? presets : [20, 50, 100],
      min_tip: v.min_tip,
      locale: v.locale as "th" | "en",
      ...(own(v.avatar_path) !== undefined ? { avatar_path: own(v.avatar_path) } : {}),
      ...(own(v.banner_path) !== undefined ? { banner_path: own(v.banner_path) } : {}),
    })
    .eq("id", profile.id);
  if (error) return { ok: false, error: error.message };

  const ppId = normalizePromptPayId(v.promptpay);
  const ppType = detectPromptPayType(ppId);
  if (!ppType || (ppType === "national_id" && !isValidNationalId(ppId))) return { ok: false, error: "promptpay" };
  const mode = v.verify_mode === "slipok" && isSlipOkConfigured() ? "slipok" : "manual";
  await supabase
    .from("streamer_private")
    .update({ promptpay_id: ppId, promptpay_type: ppType, verify_mode: mode })
    .eq("streamer_id", profile.id);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// products

const ProductInput = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000),
  price: z.coerce.number().min(1).max(100000),
});

export async function createProduct(_prev: SaveResult & { id?: string }, form: FormData) {
  const { supabase, profile } = await streamerForAction();
  const v = ProductInput.safeParse(Object.fromEntries(form));
  if (!v.success) return { ok: false, error: v.error.issues[0]?.path.join(".") };
  const { data, error } = await supabase
    .from("products")
    .insert({ ...v.data, streamer_id: profile.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/products");
  return { ok: true, id: data.id };
}

export async function updateProduct(id: string, values: z.input<typeof ProductInput>) {
  const { supabase, profile } = await streamerForAction();
  const v = ProductInput.parse(values);
  await supabase.from("products").update(v).eq("id", z.uuid().parse(id)).eq("streamer_id", profile.id);
  revalidatePath("/dashboard/products");
}

/** Signed upload URL for the private product file. The browser uploads directly. */
export async function productFileUploadUrl(productId: string, fileName: string) {
  const { supabase, profile } = await streamerForAction();
  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("id", z.uuid().parse(productId))
    .eq("streamer_id", profile.id)
    .maybeSingle();
  if (!product) throw new Error("not found");
  const clean = fileName.replace(/[^\w.\-]+/g, "-").slice(-80) || "file";
  return signedUploadUrl(BUCKETS.productFiles, `${profile.id}/${product.id}/${Date.now()}-${clean}`);
}

export async function attachProductMedia(
  productId: string,
  field: "file" | "cover" | "preview",
  path: string,
  meta?: { name: string; size: number },
) {
  const { supabase, profile } = await streamerForAction();
  if (!path.startsWith(`${profile.id}/`) || !SAFE_PATH.test(path)) throw new Error("bad path");
  const id = z.uuid().parse(productId);
  const { data: before } = await supabase
    .from("products")
    .select("file_path, cover_path, preview_audio_path")
    .eq("id", id)
    .eq("streamer_id", profile.id)
    .single();
  if (!before) throw new Error("not found");
  if (field === "file") {
    await supabase
      .from("products")
      .update({ file_path: path, file_name: meta?.name.slice(0, 200) ?? null, file_size: meta?.size ?? null })
      .eq("id", id);
    if (before.file_path && before.file_path !== path) await removeObjects(BUCKETS.productFiles, [before.file_path]);
  } else {
    await supabase
      .from("products")
      .update(field === "cover" ? { cover_path: path } : { preview_audio_path: path })
      .eq("id", id);
    const old = field === "cover" ? before.cover_path : before.preview_audio_path;
    if (old && old !== path) await removeObjects(BUCKETS.publicMedia, [old]);
  }
  revalidatePath("/dashboard/products");
}

export async function setProductPublished(productId: string, published: boolean) {
  const { supabase, profile } = await streamerForAction();
  const { error } = await supabase
    .from("products")
    .update({ is_published: published })
    .eq("id", z.uuid().parse(productId))
    .eq("streamer_id", profile.id);
  revalidatePath("/dashboard/products");
  return { ok: !error };
}

export async function deleteProduct(productId: string) {
  const { supabase, profile } = await streamerForAction();
  const id = z.uuid().parse(productId);
  const { data } = await supabase
    .from("products")
    .select("file_path, cover_path, preview_audio_path")
    .eq("id", id)
    .eq("streamer_id", profile.id)
    .maybeSingle();
  if (!data) return;
  await supabase.from("products").delete().eq("id", id);
  await removeObjects(BUCKETS.productFiles, [data.file_path ?? ""]);
  await removeObjects(BUCKETS.publicMedia, [data.cover_path ?? "", data.preview_audio_path ?? ""]);
  revalidatePath("/dashboard/products");
}

// ---------------------------------------------------------------------------
// pets

const PetInput = z.object({
  name: z.string().trim().min(1).max(24),
  species: z.string(),
  body: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  chatter: z
    .string()
    .trim()
    .toLowerCase()
    .transform((s) => (s === "" ? null : s))
    .refine((s) => s === null || /^[a-z0-9_]{2,25}$/.test(s)),
  sprite: z.unknown().optional(),
});

export async function savePet(petId: string | null, input: z.input<typeof PetInput>) {
  const { supabase, profile } = await streamerForAction();
  const v = PetInput.parse(input);
  if (v.species !== "custom" && !isPresetSpecies(v.species)) throw new Error("species");
  if (v.species === "custom" && !isPetSprite(v.sprite)) throw new Error("sprite");
  const row = {
    name: v.name,
    species: v.species,
    palette: v.species === "custom" ? {} : { ...(v.body ? { body: v.body } : {}), ...(v.accent ? { accent: v.accent } : {}) },
    sprite: v.species === "custom" ? (v.sprite as Json) : null,
    chatter: v.chatter,
  };
  if (petId) {
    await supabase.from("pets").update(row).eq("id", z.uuid().parse(petId)).eq("streamer_id", profile.id);
  } else {
    const { count } = await supabase.from("pets").select("id", { count: "exact", head: true });
    if ((count ?? 0) >= MAX_PETS) throw new Error("limit");
    await supabase.from("pets").insert({ ...row, streamer_id: profile.id });
  }
  await notifyOverlay(await channelOf(profile.id), { type: "config" });
  revalidatePath("/dashboard/pets");
}

export async function togglePet(petId: string, active: boolean) {
  const { supabase, profile } = await streamerForAction();
  await supabase.from("pets").update({ is_active: active }).eq("id", z.uuid().parse(petId)).eq("streamer_id", profile.id);
  await notifyOverlay(await channelOf(profile.id), { type: "config" });
  revalidatePath("/dashboard/pets");
}

export async function deletePet(petId: string) {
  const { supabase, profile } = await streamerForAction();
  await supabase.from("pets").delete().eq("id", z.uuid().parse(petId)).eq("streamer_id", profile.id);
  await notifyOverlay(await channelOf(profile.id), { type: "config" });
  revalidatePath("/dashboard/pets");
}
