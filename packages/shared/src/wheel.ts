import { z } from "zod";

// Prize wheel (Toonation-style roulette): a tip at or above min_amount spins it.
// The result is chosen on the server when the alert is queued, so every overlay
// and the dashboard agree on the outcome.

export const WheelSchema = z.object({
  enabled: z.boolean().catch(false),
  min_amount: z.number().min(1).max(1_000_000).catch(100),
  items: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(40),
        weight: z.number().min(0).max(1000),
      }),
    )
    .max(12)
    .catch([]),
  /** Where it spins: on the main alert overlay, or in its own OBS widget. */
  place: z.enum(["overlay", "widget"]).catch("overlay"),
  /** How it looks: slot-machine reel, round wheel, or a light board of boxes. */
  look: z.enum(["reel", "wheel", "lights"]).catch("wheel"),
});

export type WheelConfig = z.infer<typeof WheelSchema>;
export type WheelPlace = WheelConfig["place"];
export type WheelLook = WheelConfig["look"];
export const WHEEL_LOOKS: WheelLook[] = ["wheel", "reel", "lights"];

/** The reel: laps before it stops, how long it spins, and how long it stays up in total. */
export const REEL_LAPS = 6;
export const REEL_SPIN_MS = 4200;
export const WHEEL_SHOW_MS = 7500;

/** Realtime event the overlay sends to the wheel widget when a spin starts (or is skipped). */
export const WHEEL_EVENT = "wheel";
export type WheelEvent = { id: string; items: string[]; result: number } | { id: string; stop: true };

export function isWheelEvent(v: unknown): v is WheelEvent {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  if (typeof e.id !== "string") return false;
  if (e.stop === true) return true;
  return Array.isArray(e.items) && e.items.length > 1 && e.items.length <= 12 && e.items.every((x) => typeof x === "string") &&
    typeof e.result === "number" && Number.isInteger(e.result) && e.result >= 0 && e.result < e.items.length;
}

/**
 * When each label passes the marker (ms from the start), for the click sound. Matches the
 * reel's ease-out: position = target * (1 - (1 - t)^4).
 */
export function reelTickTimes(count: number, result: number): number[] {
  const rows = REEL_LAPS * count + result;
  const out: number[] = [];
  for (let k = 1; k <= rows; k++) out.push(Math.round((1 - Math.pow(1 - k / rows, 1 / 4)) * REEL_SPIN_MS));
  return out;
}

export function parseWheel(raw: unknown): WheelConfig {
  return WheelSchema.parse(raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {});
}

/** Weighted pick. Items with weight 0 never win. Returns -1 if nothing can win. */
export function pickWeighted(weights: number[], random: () => number = Math.random): number {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (total <= 0) return -1;
  let r = random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r < 0) return i;
  }
  return weights.findLastIndex((w) => w > 0);
}

export function spinFor(cfg: WheelConfig, amount: number, random?: () => number) {
  if (!cfg.enabled || amount < cfg.min_amount || cfg.items.length < 2) return null;
  const result = pickWeighted(
    cfg.items.map((i) => i.weight),
    random,
  );
  if (result < 0) return null;
  return { items: cfg.items.map((i) => i.label), result };
}
