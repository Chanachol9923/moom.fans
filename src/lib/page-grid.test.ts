import { describe, expect, it } from "vitest";
import { parsePageConfig } from "./page-config";
import { BOX_IDS, flatBoxes, moveBox, normalizeGrid, presetGrid, resizeCol, updateBox, type Grid } from "./page-grid";

const ids = (g: Grid) => g.rows.map((r) => r.cols.map((c) => c.boxes.map((b) => b.id)));
const widths = (g: Grid) => g.rows.map((r) => r.cols.map((c) => c.w));

describe("page layout from older saves", () => {
  it("split keeps the tip box on the left and the section order on the right", () => {
    const c = parsePageConfig({ layout: "split", sections: [{ id: "shop", visible: false }] });
    expect(ids(c.grid)).toEqual([[["tip"], ["shop", "goal", "about", "supporters"]]]);
    expect(widths(c.grid)).toEqual([[5, 7]]);
    expect(c.grid.rows[0].cols[1].boxes[0].hidden).toBe(true);
  });

  it("split-right and single", () => {
    expect(ids(parsePageConfig({ layout: "split-right" }).grid)[0][1]).toEqual(["tip"]);
    const single = parsePageConfig({ layout: "single" }).grid;
    expect(ids(single)).toEqual([[["tip", "goal", "about", "shop", "supporters"]]]);
    expect(widths(single)).toEqual([[8]]);
  });
});

describe("normalizeGrid", () => {
  it("has every box exactly once and never hides the tip box", () => {
    const g = normalizeGrid({
      rows: [
        { cols: [{ w: 12, boxes: [{ id: "goal", hidden: false, minH: 0 }, { id: "goal", hidden: true, minH: 0 }] }] },
        { cols: [{ w: 6, boxes: [] }] },
        { cols: [{ w: 9, boxes: [{ id: "tip", hidden: true, minH: 0 }] }, { w: 9, boxes: [{ id: "shop", hidden: true, minH: 0 }] }] },
      ],
    });
    expect(flatBoxes(g).map((b) => b.id).sort()).toEqual([...BOX_IDS].sort());
    expect(flatBoxes(g).find((b) => b.id === "tip")!.hidden).toBe(false);
    expect(g.rows).toHaveLength(2);
    for (const r of g.rows) expect(r.cols.reduce((n, c) => n + c.w, 0)).toBeLessThanOrEqual(12);
  });

  it("junk falls back to the default layout", () => {
    expect(ids(parsePageConfig({ grid: { rows: "x" } }).grid)).toEqual(ids(presetGrid("left")));
    expect(ids(parsePageConfig({ grid: { rows: [{ cols: [{ w: 4, boxes: [{ id: "evil" }] }] }] } }).grid)).toEqual(ids(presetGrid("left")));
  });
});

describe("moving and resizing", () => {
  const start = presetGrid("left");

  it("before / after within a column", () => {
    const g = moveBox(start, "supporters", { kind: "before", target: "goal" });
    expect(ids(g)[0][1]).toEqual(["supporters", "goal", "about", "shop"]);
  });

  it("dropping on a side makes a new column and keeps the row at 12", () => {
    const g = moveBox(start, "goal", { kind: "right", target: "about" });
    expect(ids(g)[0]).toEqual([["tip"], ["about", "shop", "supporters"], ["goal"]]);
    expect(widths(g)[0].reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(12);
  });

  it("a new full-width row; the column it left gives its width back", () => {
    const g = moveBox(start, "tip", { kind: "row", index: 0 });
    expect(ids(g)).toEqual([[["tip"]], [["goal", "about", "shop", "supporters"]]]);
    expect(widths(g)).toEqual([[12], [12]]);
  });

  it("moving the only box of a row to another row removes the row", () => {
    const two = moveBox(start, "supporters", { kind: "row", index: 1 });
    expect(two.rows).toHaveLength(2);
    const back = moveBox(two, "supporters", { kind: "after", target: "shop" });
    expect(back.rows).toHaveLength(1);
  });

  it("dropping on itself changes nothing", () => {
    expect(moveBox(start, "goal", { kind: "before", target: "goal" })).toBe(start);
  });

  it("resizing trades width with the neighbour, within limits", () => {
    expect(widths(resizeCol(start, 0, 0, 8))).toEqual([[8, 4]]);
    expect(widths(resizeCol(start, 0, 0, 11))).toEqual([[9, 3]]);
    const single = presetGrid("single");
    expect(widths(resizeCol(single, 0, 0, 20))).toEqual([[12]]);
  });

  it("hide and stretch", () => {
    const g = updateBox(start, "shop", { hidden: true, minH: 320 });
    expect(flatBoxes(g).find((b) => b.id === "shop")).toEqual({ id: "shop", hidden: true, minH: 320 });
  });
});
