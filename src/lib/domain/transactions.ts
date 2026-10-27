import "server-only";
import { z } from "zod";
import { alertForTransaction } from "@/lib/domain/alerts";
import { canonicalMediaUrl, mediaSecondsFor, parseMediaUrl } from "@/lib/media";
import { parsePageConfig } from "@/lib/page-config";
import { readSlip, slipProblems } from "@/lib/slipok";
import { parseGifs } from "@moom/shared/overlay/design";
import { BUCKETS } from "@/lib/storage";
import { putObject } from "@/lib/storage.server";
import { admin } from "@/lib/supabase/admin";
import type { Json, TransactionRow } from "@/lib/supabase/database.types";
import { newToken } from "@/lib/tokens";

/** How long the QR is shown for, and extra time to still accept a slip after that. */
export const PAYMENT_WINDOW_MIN = 30;
export const SLIP_GRACE_MIN = 60;
export const MAX_SLIP_BYTES = 5 * 1024 * 1024;
const SLIP_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export const CreateTxInput = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("tip"),
    name: z.string().trim().max(40).default(""),
    message: z.string().trim().max(300).default(""),
    amount: z.number().positive().max(1_000_000),
    mediaUrl: z.string().trim().max(300).optional(),
    anonymous: z.boolean().default(false),
    showOnWall: z.boolean().default(true),
    /** Gift units: when set, the amount is qty × the streamer's unit price. */
    unitQty: z.number().int().min(1).max(999).optional(),
    /** Vote in the active poll. */
    pollOption: z.number().int().min(0).max(9).optional(),
    /** GIF picked from the streamer's list to show with the alert. */
    gifId: z.string().regex(/^[a-z0-9]{6,16}$/).optional(),
  }),
  z.object({
    kind: z.literal("purchase"),
    productId: z.uuid(),
    name: z.string().trim().min(1).max(40),
    email: z.email().max(200),
    message: z.string().trim().max(300).default(""),
    anonymous: z.boolean().default(false),
    showOnWall: z.boolean().default(true),
  }),
]);
export type CreateTxInput = z.infer<typeof CreateTxInput>;

export class TxError extends Error {
  constructor(
    public code:
      | "not_found"
      | "amount_too_low"
      | "media_disabled"
      | "media_invalid"
      | "media_too_short"
      | "name_required"
      | "unit_disabled"
      | "poll_closed"
      | "gif_unavailable"
      | "product_unavailable"
      | "bad_state"
      | "too_late"
      | "bad_file",
    message?: string,
  ) {
    super(message ?? code);
  }
}

export async function createTransaction(slug: string, input: CreateTxInput) {
  const db = admin();
  const { data: profile } = await db.from("profiles").select("id, min_tip, page").eq("slug", slug).maybeSingle();
  if (!profile) throw new TxError("not_found");
  const { data: priv } = await db
    .from("streamer_private")
    .select("streamer_id")
    .eq("streamer_id", profile.id)
    .maybeSingle();
  if (!priv) throw new TxError("not_found");

  if (!input.anonymous && !input.name) throw new TxError("name_required");
  const base = {
    streamer_id: profile.id,
    // Anonymous supporters may still type a name for the streamer's eyes only.
    supporter_name: input.name || "-",
    is_anonymous: input.anonymous,
    show_on_wall: input.showOnWall,
    message: input.message,
    public_token: newToken(),
    expires_at: new Date(Date.now() + PAYMENT_WINDOW_MIN * 60_000).toISOString(),
  };

  if (input.kind === "tip") {
    let amount = roundBaht(input.amount);
    let unit_qty: number | null = null;
    if (input.unitQty) {
      const unit = parsePageConfig(profile.page).unit;
      if (!unit.enabled) throw new TxError("unit_disabled");
      unit_qty = input.unitQty;
      amount = roundBaht(unit.price * unit_qty);
    }
    let poll_id: string | null = null;
    let poll_option: number | null = null;
    if (input.pollOption !== undefined) {
      const { data: poll } = await db
        .from("polls")
        .select("id, options")
        .eq("streamer_id", profile.id)
        .eq("is_active", true)
        .maybeSingle();
      const count = Array.isArray(poll?.options) ? poll.options.length : 0;
      if (!poll || input.pollOption >= count) throw new TxError("poll_closed");
      poll_id = poll.id;
      poll_option = input.pollOption;
    }
    if (amount < Number(profile.min_tip)) throw new TxError("amount_too_low");
    let alert_gif: string | null = null;
    if (input.gifId) {
      const { data: g } = await db
        .from("overlay_settings")
        .select("alert_gifs, gif_min_amount")
        .eq("streamer_id", profile.id)
        .single();
      const listed = parseGifs(g?.alert_gifs).some((x) => x.id === input.gifId);
      // Removed since the page loaded, or the tip is below the streamer's minimum for picking.
      if (!g || !listed || amount < Number(g.gif_min_amount)) throw new TxError("gif_unavailable");
      alert_gif = input.gifId;
    }
    let media_url: string | null = null;
    let media_seconds: number | null = null;
    if (input.mediaUrl) {
      const { data: s } = await db
        .from("overlay_settings")
        .select("media_enabled, media_baht_per_second, media_max_seconds")
        .eq("streamer_id", profile.id)
        .single();
      if (!s?.media_enabled) throw new TxError("media_disabled");
      const ref = parseMediaUrl(input.mediaUrl);
      if (!ref) throw new TxError("media_invalid");
      media_seconds = mediaSecondsFor(amount, Number(s.media_baht_per_second), s.media_max_seconds);
      if (media_seconds < 1) throw new TxError("media_too_short");
      media_url = canonicalMediaUrl(ref);
    }
    const { data, error } = await db
      .from("transactions")
      .insert({ ...base, kind: "tip", amount, media_url, media_seconds, unit_qty, poll_id, poll_option, alert_gif })
      .select("public_token")
      .single();
    if (error) throw error;
    return data.public_token;
  }

  const { data: product } = await db
    .from("products")
    .select("id, title, price, is_published, streamer_id")
    .eq("id", input.productId)
    .maybeSingle();
  if (!product || !product.is_published || product.streamer_id !== profile.id) {
    throw new TxError("product_unavailable");
  }
  const { data, error } = await db
    .from("transactions")
    .insert({
      ...base,
      kind: "purchase",
      product_id: product.id,
      product_title: product.title,
      supporter_email: input.email.toLowerCase(),
      amount: Number(product.price),
    })
    .select("public_token")
    .single();
  if (error) throw error;
  return data.public_token;
}

function roundBaht(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function getTransactionByToken(token: string): Promise<TransactionRow | null> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const { data } = await admin().from("transactions").select("*").eq("public_token", token).maybeSingle();
  return data;
}

/** What the supporter's payment page shows. Status 'expired' is derived, not stored. */
export function publicStatus(tx: TransactionRow): TransactionRow["status"] {
  if (tx.status === "awaiting_payment" && Date.now() > slipDeadline(tx)) return "expired";
  return tx.status;
}

export function slipDeadline(tx: Pick<TransactionRow, "expires_at">): number {
  return new Date(tx.expires_at).getTime() + SLIP_GRACE_MIN * 60_000;
}

/**
 * Supporter uploaded a slip. Store it, then either auto-verify with SlipOK or put the
 * payment in the streamer's review queue.
 */
export async function submitSlip(token: string, file: File): Promise<TransactionRow["status"]> {
  const tx = await getTransactionByToken(token);
  if (!tx) throw new TxError("not_found");
  if (tx.status !== "awaiting_payment") throw new TxError("bad_state");
  if (Date.now() > slipDeadline(tx)) throw new TxError("too_late");
  if (!SLIP_TYPES.has(file.type) || file.size === 0 || file.size > MAX_SLIP_BYTES) throw new TxError("bad_file");

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${tx.streamer_id}/${tx.id}.${ext}`;
  await putObject(BUCKETS.slips, path, await file.arrayBuffer(), file.type);

  const db = admin();
  const { data: claimed } = await db
    .from("transactions")
    .update({ status: "pending_review", slip_path: path, submitted_at: new Date().toISOString() })
    .eq("id", tx.id)
    .eq("status", "awaiting_payment")
    .select("*")
    .maybeSingle();
  if (!claimed) throw new TxError("bad_state");

  const { data: priv } = await db
    .from("streamer_private")
    .select("verify_mode, promptpay_id")
    .eq("streamer_id", tx.streamer_id)
    .single();
  if (priv?.verify_mode !== "slipok") return "pending_review";

  const slip = await readSlip(file);
  if (slip.status !== "read") {
    await db
      .from("transactions")
      .update({ verification: { source: "slipok", status: slip.status, reason: slip.reason } })
      .eq("id", tx.id);
    return "pending_review";
  }

  const problems = slipProblems(slip, {
    amount: Number(tx.amount),
    promptpayId: priv.promptpay_id,
    createdAt: new Date(tx.created_at),
  });
  const verification: Json = {
    source: "slipok",
    status: "read",
    transRef: slip.transRef,
    amount: slip.amount,
    paidAt: slip.paidAt?.toISOString() ?? null,
    receiver: slip.receiverHint,
    problems,
  };

  if (problems.length) {
    await db.from("transactions").update({ verification }).eq("id", tx.id);
    return "pending_review";
  }
  const ok = await verifyTransaction(tx.id, "slipok", { verification, transRef: slip.transRef });
  return ok ? "verified" : "pending_review";
}

/**
 * Mark paid and queue the alert. Idempotent: only the first caller wins, so a
 * double-click, a retry, or SlipOK + manual approve racing can't alert twice.
 */
export async function verifyTransaction(
  txId: string,
  method: "manual" | "slipok",
  extra: { verification?: Json; transRef?: string; note?: string } = {},
): Promise<boolean> {
  const db = admin();
  const { data, error } = await db
    .from("transactions")
    .update({
      status: "verified",
      verify_method: method,
      verified_at: new Date().toISOString(),
      ...(extra.verification !== undefined ? { verification: extra.verification } : {}),
      ...(extra.transRef ? { slip_trans_ref: extra.transRef } : {}),
      ...(extra.note ? { review_note: extra.note } : {}),
    })
    .eq("id", txId)
    .in("status", ["awaiting_payment", "pending_review"])
    .select("*")
    .maybeSingle();

  if (error) {
    // 23505 = unique violation on slip_trans_ref: this slip already paid for something else.
    if (error.code === "23505") {
      await db
        .from("transactions")
        .update({ verification: { ...(asObject(extra.verification)), problems: ["slip already used"] } })
        .eq("id", txId);
      return false;
    }
    throw error;
  }
  if (!data) return false;
  await alertForTransaction(data);
  return true;
}

export async function rejectTransaction(txId: string, note?: string): Promise<boolean> {
  const { data } = await admin()
    .from("transactions")
    .update({ status: "rejected", review_note: note ?? null })
    .eq("id", txId)
    .in("status", ["awaiting_payment", "pending_review"])
    .select("id")
    .maybeSingle();
  return Boolean(data);
}

function asObject(v: Json | undefined): Record<string, Json | undefined> {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}
