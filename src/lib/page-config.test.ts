import { describe, expect, it } from "vitest";
import { parsePageConfig, SECTION_IDS } from "./page-config";
import { ICON_ROWS_FOR_TEST, ICON_SIZE } from "./pets/icons";
import { parseWheel, pickWeighted, spinFor } from "./wheel";

describe("parsePageConfig", () => {
  it("fills defaults for empty / junk input", () => {
    for (const raw of [null, undefined, [], "x", {}]) {
      const c = parsePageConfig(raw);
      expect(c.theme).toBe("pigeon");
      expect(c.sections.map((s) => s.id)).toEqual([...SECTION_IDS]);
      expect(c.unit.enabled).toBe(false);
    }
  });

  it("keeps valid values and repairs bad ones field by field", () => {
    const c = parsePageConfig({
      theme: "night",
      background: "lava",
      tipTitle: "x".repeat(500),
      sections: [{ id: "shop", visible: false }, { id: "shop", visible: true }, { id: "nope", visible: true }],
      unit: { enabled: true, name: "ขนมปัง", price: 25, icon: "bread", presets: [1, 2] },
    });
    expect(c.theme).toBe("night");
    expect(c.background).toBe("dots");
    expect(c.tipTitle).toBe("");
    // a bad item invalidates the list, which falls back to the default order
    expect(c.sections.map((s) => s.id)).toEqual([...SECTION_IDS]);
    expect(c.unit).toMatchObject({ enabled: true, name: "ขนมปัง", price: 25, icon: "bread" });
  });

  it("dedupes and completes the section order", () => {
    const c = parsePageConfig({ sections: [{ id: "shop", visible: false }, { id: "shop", visible: true }] });
    expect(c.sections[0]).toEqual({ id: "shop", visible: false });
    expect(c.sections).toHaveLength(SECTION_IDS.length);
  });
});

describe("gift icons", () => {
  it.each(Object.entries(ICON_ROWS_FOR_TEST))("%s is 12x12", (_n, rows) => {
    expect(rows).toHaveLength(ICON_SIZE);
    for (const r of rows) expect(r).toHaveLength(ICON_SIZE);
  });
});

describe("wheel", () => {
  it("picks by weight", () => {
    expect(pickWeighted([1, 1], () => 0.1)).toBe(0);
    expect(pickWeighted([1, 1], () => 0.9)).toBe(1);
    expect(pickWeighted([0, 5, 0], () => 0.99)).toBe(1);
    expect(pickWeighted([0, 0])).toBe(-1);
  });

  it("only spins when enabled and above the minimum", () => {
    const cfg = parseWheel({ enabled: true, min_amount: 100, items: [{ label: "วิดพื้น", weight: 1 }, { label: "ร้องเพลง", weight: 1 }] });
    expect(spinFor(cfg, 50)).toBeNull();
    expect(spinFor(cfg, 100, () => 0.7)).toEqual({ items: ["วิดพื้น", "ร้องเพลง"], result: 1 });
    expect(spinFor({ ...cfg, enabled: false }, 500)).toBeNull();
  });
});
