import { describe, expect, it } from "vitest";
import type { OverlayAlert, VtsRule } from "@/lib/alerts/types";
import { mergeQueue, vtsActionsFor } from "./queue";

const a = (id: string, t: string): OverlayAlert => ({
  id,
  kind: "tip",
  createdAt: t,
  payload: { name: id, amount: 1, message: "", productTitle: null, media: null, tts: false, locale: "th" },
});

describe("mergeQueue", () => {
  it("dedupes, drops handled ones and keeps FIFO order", () => {
    const merged = mergeQueue(
      [a("2", "2026-01-01T00:00:02Z")],
      [a("1", "2026-01-01T00:00:01Z"), a("2", "2026-01-01T00:00:02Z"), a("3", "2026-01-01T00:00:03Z")],
      new Set(["3"]),
    );
    expect(merged.map((x) => x.id)).toEqual(["1", "2"]);
  });
});

describe("vtsActionsFor", () => {
  const rules: VtsRule[] = [
    { min_amount: 20, kind: "hotkey", ref: "smile", label: "" },
    { min_amount: 100, kind: "hotkey", ref: "blush", label: "" },
    { min_amount: 50, kind: "item", ref: "banana.png", label: "" },
  ];
  it("picks the best rule per kind", () => {
    expect(vtsActionsFor(rules, 10)).toEqual([]);
    expect(vtsActionsFor(rules, 60).map((r) => r.ref)).toEqual(["smile", "banana.png"]);
    expect(vtsActionsFor(rules, 500).map((r) => r.ref)).toEqual(["blush", "banana.png"]);
  });
});
