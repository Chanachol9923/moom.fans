import "server-only";
import { z } from "zod";
import { serverEnv } from "@/lib/env";

// SlipOK (slipok.com) reads the QR on a Thai bank slip and asks the bank network
// whether the transfer is real. We never auto-reject on its answer: anything that
// doesn't pass every check drops to the streamer's manual review queue instead.
//
// NOTE: the response shape below is from SlipOK's public docs as best understood;
// verify against a real response once an API key exists (see README "ต้องเตรียม").

const Party = z
  .object({
    displayName: z.string().optional(),
    name: z.string().optional(),
    proxy: z.object({ type: z.string().nullish(), value: z.string().nullish() }).nullish(),
    account: z.object({ type: z.string().nullish(), value: z.string().nullish() }).nullish(),
  })
  .passthrough();

const SlipData = z
  .object({
    transRef: z.string(),
    transDate: z.string().optional(), // yyyymmdd
    transTime: z.string().optional(), // HH:mm:ss (Bangkok time)
    amount: z.number(),
    receiver: Party.optional(),
    sender: Party.optional(),
  })
  .passthrough();

const Response = z
  .object({
    success: z.boolean().optional(),
    code: z.number().optional(),
    message: z.string().optional(),
    data: z.unknown().optional(),
  })
  .passthrough();

export type SlipCheck =
  | { status: "unavailable"; reason: string }
  | { status: "error"; reason: string; raw?: unknown }
  | {
      status: "read";
      transRef: string;
      amount: number;
      paidAt: Date | null;
      receiverHint: string | null;
      raw: unknown;
    };

export function isSlipOkConfigured(): boolean {
  return serverEnv.slipok() !== null;
}

export async function readSlip(file: Blob): Promise<SlipCheck> {
  const cfg = serverEnv.slipok();
  if (!cfg) return { status: "unavailable", reason: "SLIPOK_API_KEY / SLIPOK_BRANCH_ID not set" };

  const form = new FormData();
  form.append("files", file, "slip.jpg");
  form.append("log", "true");

  let json: unknown;
  try {
    const res = await fetch(`https://api.slipok.com/api/line/apikey/${encodeURIComponent(cfg.branchId)}`, {
      method: "POST",
      headers: { "x-authorization": cfg.apiKey },
      body: form,
      signal: AbortSignal.timeout(15_000),
    });
    json = await res.json();
  } catch (e) {
    return { status: "error", reason: `request failed: ${(e as Error).message}` };
  }

  return parseSlipOkResponse(json);
}

export function parseSlipOkResponse(json: unknown): SlipCheck {
  const top = Response.safeParse(json);
  if (!top.success) return { status: "error", reason: "unexpected response", raw: json };
  const data = SlipData.safeParse(top.data.data);
  if (!data.success || top.data.success === false) {
    return {
      status: "error",
      reason: top.data.message ?? `code ${top.data.code ?? "?"}`,
      raw: json,
    };
  }
  const d = data.data;
  return {
    status: "read",
    transRef: d.transRef,
    amount: d.amount,
    paidAt: bangkokDate(d.transDate, d.transTime),
    receiverHint: d.receiver?.proxy?.value ?? d.receiver?.account?.value ?? null,
    raw: json,
  };
}

function bangkokDate(date?: string, time?: string): Date | null {
  if (!date || !/^\d{8}$/.test(date)) return null;
  const t = time && /^\d{2}:\d{2}(:\d{2})?$/.test(time) ? time : "00:00:00";
  const iso = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${t.length === 5 ? `${t}:00` : t}+07:00`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Our own checks on top of SlipOK: right amount, paid to this streamer, and not an
 * old slip being reused. Returns the list of problems (empty = auto-approve).
 */
export function slipProblems(
  slip: Extract<SlipCheck, { status: "read" }>,
  expected: { amount: number; promptpayId: string; createdAt: Date },
): string[] {
  const problems: string[] = [];
  if (Math.abs(slip.amount - expected.amount) > 0.001) {
    problems.push(`amount ${slip.amount} ≠ ${expected.amount}`);
  }
  // Receiver ids come back masked (e.g. "xxx-xxx-5678"); compare the visible digits.
  const hint = (slip.receiverHint ?? "").replace(/[^0-9]/g, "");
  const tail = expected.promptpayId.replace(/[^0-9]/g, "").slice(-4);
  if (!hint) problems.push("receiver not shown on slip");
  else if (!hint.endsWith(tail) && !expected.promptpayId.endsWith(hint.slice(-4))) {
    problems.push(`receiver ${slip.receiverHint} doesn't match`);
  }
  // Slip time is minute-precision at best; allow some clock slack.
  if (slip.paidAt && slip.paidAt.getTime() < expected.createdAt.getTime() - 5 * 60_000) {
    problems.push("slip is older than this payment");
  }
  return problems;
}
