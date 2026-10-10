import { describe, expect, it } from "vitest";
import { goalRaised, pollTotals, recentFrom, topFrom } from "./wall";

const tx = (o: Partial<Parameters<typeof topFrom>[0][number]>) => ({
  amount: 10,
  supporter_name: "a",
  is_anonymous: false,
  show_on_wall: true,
  kind: "tip" as const,
  verified_at: "2026-10-01T00:00:00Z",
  poll_id: null,
  poll_option: null,
  ...o,
});

describe("goalRaised", () => {
  const goal = { starting_amount: 100, include_purchases: false, starts_at: "2026-10-01T00:00:00Z", ends_at: null };
  it("adds tips after the start, skips purchases unless asked", () => {
    const txs = [
      tx({ amount: 50 }),
      tx({ amount: 30, kind: "purchase" }),
      tx({ amount: 999, verified_at: "2026-09-01T00:00:00Z" }),
    ];
    expect(goalRaised(goal, txs)).toBe(150);
    expect(goalRaised({ ...goal, include_purchases: true }, txs)).toBe(180);
  });
});

describe("wall", () => {
  const txs = [
    tx({ supporter_name: "Nok", amount: 20 }),
    tx({ supporter_name: "nok ", amount: 30 }),
    tx({ supporter_name: "Mew", amount: 40 }),
    tx({ supporter_name: "secret", amount: 500, is_anonymous: true }),
    tx({ supporter_name: "shy", amount: 900, show_on_wall: false }),
  ];

  it("ranks by name ignoring case, without anonymous or hidden tips", () => {
    expect(topFrom(txs, 5)).toEqual([
      { name: "Nok", total: 50 },
      { name: "Mew", total: 40 },
    ]);
  });

  it("shows anonymous tips as anonymous in the recent list, hides opted-out ones", () => {
    const r = recentFrom(txs, 10, "en").map((x) => x.name);
    expect(r).toContain("Anonymous supporter");
    expect(r).not.toContain("secret");
    expect(r).not.toContain("shy");
  });
});

describe("pollTotals", () => {
  const poll = { id: "p", options: ["a", "b"], weight_by: "amount" as const };
  const txs = [
    tx({ poll_id: "p", poll_option: 0, amount: 10 }),
    tx({ poll_id: "p", poll_option: 1, amount: 25 }),
    tx({ poll_id: "p", poll_option: 1, amount: 5 }),
    tx({ poll_id: "other", poll_option: 0, amount: 100 }),
  ];
  it("sums by amount or counts votes", () => {
    expect(pollTotals(poll, txs)).toEqual([10, 30]);
    expect(pollTotals({ ...poll, weight_by: "count" }, txs)).toEqual([1, 2]);
  });
});
