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
});

export type WheelConfig = z.infer<typeof WheelSchema>;

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
