import type { OverlayAlert, VtsRule } from "@moom/shared/alerts";

/**
 * Merge a fresh server snapshot into the local FIFO. Keeps arrival order, drops
 * anything already handled locally (the server may lag behind our acks).
 */
export function mergeQueue(current: OverlayAlert[], incoming: OverlayAlert[], handled: ReadonlySet<string>): OverlayAlert[] {
  const seen = new Set<string>();
  const out: OverlayAlert[] = [];
  for (const a of [...current, ...incoming]) {
    if (seen.has(a.id) || handled.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }
  return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Highest-threshold matching rule of each kind, so a big tip doesn't fire every tier at once. */
export function vtsActionsFor(rules: VtsRule[], amount: number): VtsRule[] {
  const best = new Map<VtsRule["kind"], VtsRule>();
  for (const r of rules) {
    if (amount < r.min_amount) continue;
    const cur = best.get(r.kind);
    if (!cur || r.min_amount > cur.min_amount) best.set(r.kind, r);
  }
  return [...best.values()];
}

export const POSITION_CLASS: Record<string, string> = {
  "top-left": "items-start justify-start",
  "top-center": "items-start justify-center",
  "top-right": "items-start justify-end",
  center: "items-center justify-center",
  "bottom-left": "items-end justify-start",
  "bottom-center": "items-end justify-center",
  "bottom-right": "items-end justify-end",
};
