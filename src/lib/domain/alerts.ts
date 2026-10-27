import "server-only";
import type { AlertKind, AlertPayload } from "@moom/shared/alerts";
import { buildFilter, cleanMessage, DEFAULT_BLOCKED_WORDS } from "@/lib/filter";
import { getDict, type Locale } from "@moom/shared/i18n";
import { parseMediaUrl } from "@/lib/media";
import { parsePageConfig, type PageConfig } from "@/lib/page-config";
import { notifyOverlay } from "@/lib/realtime";
import { admin } from "@/lib/supabase/admin";
import type { OverlaySettingsRow, TransactionRow } from "@/lib/supabase/database.types";
import { parseWheel, spinFor } from "@moom/shared/wheel";
import { mediaKindOf, parseGifs } from "@moom/shared/overlay/design";
import { publicMediaUrl } from "@/lib/storage";

type Ctx = {
  settings: OverlaySettingsRow;
  blockedWords: string[];
  channel: string;
  locale: Locale;
  page: PageConfig;
};

export async function loadAlertContext(streamerId: string): Promise<Ctx | null> {
  const db = admin();
  const [s, p, prof] = await Promise.all([
    db.from("overlay_settings").select("*").eq("streamer_id", streamerId).maybeSingle(),
    db.from("streamer_private").select("blocked_words, overlay_channel").eq("streamer_id", streamerId).maybeSingle(),
    db.from("profiles").select("locale, page").eq("id", streamerId).maybeSingle(),
  ]);
  if (!s.data || !p.data) return null;
  return {
    settings: s.data,
    blockedWords: p.data.blocked_words,
    channel: p.data.overlay_channel,
    locale: prof.data?.locale ?? "th",
    page: parsePageConfig(prof.data?.page),
  };
}

type PayloadSource = Pick<
  TransactionRow,
  "supporter_name" | "amount" | "message" | "product_title" | "media_url" | "media_seconds"
> &
  Partial<Pick<TransactionRow, "is_anonymous" | "unit_qty" | "alert_gif">> & { voteLabel?: string | null; spin?: boolean };

/** The picked GIF as a URL, snapshotted into the alert. Gone from the list = no GIF. */
function pickedGif(id: string | null | undefined, ctx: Ctx): AlertPayload["gif"] {
  if (!id) return null;
  const g = parseGifs(ctx.settings.alert_gifs, `${ctx.settings.streamer_id}/`).find((x) => x.id === id);
  const url = g && publicMediaUrl(g.path);
  const kind = g ? mediaKindOf(g.path) : null;
  return url && kind ? { url, kind } : null;
}

export function buildPayload(tx: PayloadSource, ctx: Ctx): AlertPayload {
  const filter = buildFilter([...DEFAULT_BLOCKED_WORDS, ...ctx.blockedWords]);
  const d = getDict(ctx.locale);
  const media =
    ctx.settings.media_enabled && tx.media_url && tx.media_seconds ? parseMediaUrl(tx.media_url) : null;
  const amount = Number(tx.amount);
  const unit = ctx.page.unit;
  return {
    name: tx.is_anonymous
      ? d.store.anonymous
      : filter.mask(cleanMessage(tx.supporter_name)).slice(0, 40) || "?",
    amount,
    message: filter.mask(cleanMessage(tx.message)).slice(0, 300),
    productTitle: tx.product_title,
    media: media ? { id: media.id, start: media.start, seconds: tx.media_seconds! } : null,
    tts: ctx.settings.tts_enabled && amount >= Number(ctx.settings.tts_min_amount),
    locale: ctx.locale,
    unit: tx.unit_qty && unit.enabled ? { name: unit.name, qty: tx.unit_qty, icon: unit.icon } : null,
    wheel: tx.spin === false ? null : spinFor(parseWheel(ctx.settings.wheel), amount),
    vote: tx.voteLabel ? filter.mask(tx.voteLabel) : null,
    gif: pickedGif(tx.alert_gif, ctx),
  };
}

async function voteLabel(tx: TransactionRow): Promise<string | null> {
  if (!tx.poll_id || tx.poll_option === null) return null;
  const { data } = await admin().from("polls").select("options").eq("id", tx.poll_id).maybeSingle();
  const opts = Array.isArray(data?.options) ? (data.options as unknown[]) : [];
  const label = opts[tx.poll_option];
  return typeof label === "string" ? label : null;
}

/**
 * Side effects of a verified payment: queue the on-stream alert (respecting the
 * streamer's threshold) and add subathon time.
 */
export async function alertForTransaction(tx: TransactionRow): Promise<void> {
  const ctx = await loadAlertContext(tx.streamer_id);
  if (!ctx) return;

  const perBaht = Number(ctx.settings.subathon_seconds_per_baht);
  if (perBaht > 0) {
    const seconds = Math.round(Number(tx.amount) * perBaht);
    const { error } = await admin().rpc("subathon_add", { p_streamer: tx.streamer_id, p_seconds: seconds });
    if (error) console.warn("subathon_add failed", error.message);
  }

  // Purchases always alert; tips only above the minimum. Below it, still nudge the
  // widgets (goal bar, leaderboard) so they update without waiting for their poll.
  if (tx.kind === "tip" && Number(tx.amount) < Number(ctx.settings.min_alert_amount)) {
    await notifyOverlay(ctx.channel, { type: "config" });
    return;
  }
  const payload = buildPayload({ ...tx, voteLabel: await voteLabel(tx) }, ctx);
  await insertAlert(tx.streamer_id, tx.kind, payload, tx.id, ctx);
}

export async function insertAlert(
  streamerId: string,
  kind: AlertKind,
  payload: AlertPayload,
  transactionId: string | null,
  ctx: Ctx,
) {
  const held = Boolean(payload.media) && ctx.settings.media_requires_approval;
  const { error } = await admin()
    .from("alerts")
    .insert({ streamer_id: streamerId, kind, payload, transaction_id: transactionId, status: held ? "held" : "queued" });
  if (error) throw new Error(`alerts: insert failed: ${error.message}`);
  if (!held) await notifyOverlay(ctx.channel, { type: "alerts" });
}

export async function queueTestAlert(
  streamerId: string,
  sample: {
    kind: "tip" | "purchase";
    name: string;
    amount: number;
    message: string;
    productTitle?: string;
    mediaUrl?: string;
    unitQty?: number;
    spin?: boolean;
    gifId?: string;
  },
) {
  const ctx = await loadAlertContext(streamerId);
  if (!ctx) throw new Error("overlay settings missing");
  const media = sample.mediaUrl ? parseMediaUrl(sample.mediaUrl) : null;
  const wheel = parseWheel(ctx.settings.wheel);
  const payload = buildPayload(
    {
      supporter_name: sample.name,
      amount: sample.spin ? Math.max(sample.amount, wheel.min_amount) : sample.amount,
      message: sample.message,
      product_title: sample.productTitle ?? null,
      media_url: media ? sample.mediaUrl! : null,
      media_seconds: media ? Math.min(15, ctx.settings.media_max_seconds) : null,
      unit_qty: sample.unitQty ?? null,
      spin: sample.spin ?? false,
      alert_gif: sample.gifId ?? null,
    },
    {
      ...ctx,
      settings: { ...ctx.settings, media_enabled: Boolean(media) },
      page: sample.unitQty ? { ...ctx.page, unit: { ...ctx.page.unit, enabled: true } } : ctx.page,
    },
  );
  // Tests skip the approval hold so the streamer sees the result immediately.
  const { error } = await admin()
    .from("alerts")
    .insert({ streamer_id: streamerId, kind: "test", payload, status: "queued" });
  if (error) throw new Error(error.message);
  await notifyOverlay(ctx.channel, { type: "alerts" });
}

/** Put a finished or skipped alert back at the end of the queue. */
export async function replayAlert(streamerId: string, alertId: string) {
  const db = admin();
  const { data: a } = await db
    .from("alerts")
    .select("kind, payload, transaction_id")
    .eq("id", alertId)
    .eq("streamer_id", streamerId)
    .maybeSingle();
  if (!a) return;
  await db.from("alerts").insert({ streamer_id: streamerId, kind: a.kind, payload: a.payload, transaction_id: a.transaction_id });
  const ctx = await loadAlertContext(streamerId);
  if (ctx) await notifyOverlay(ctx.channel, { type: "alerts" });
}
