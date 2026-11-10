import { z } from "zod";

// The tip page's boxes, laid out by the streamer: rows of up to 4 columns, each column a
// stack of boxes. Heights follow the content (a box can be stretched taller), so the page
// never has gaps or overlaps. On phones everything stacks in reading order.

export const BOX_IDS = ["tip", "goal", "about", "shop", "supporters"] as const;
export type FixedBoxId = (typeof BOX_IDS)[number];
/** The streamer's own text boxes: "text-" plus a short random id. */
export type TextBoxId = `text-${string}`;
export type BoxId = FixedBoxId | TextBoxId;
export const MAX_TEXTS = 10;
export const TEXT_ID = /^text-[a-z0-9]{4,16}$/;
export const isTextBox = (id: string): id is TextBoxId => TEXT_ID.test(id);

export const MAX_ROWS = 8;
export const MAX_COLS = 4;
/** Narrowest column, in twelfths of the page. */
export const MIN_W = 3;

export type GridBox = { id: BoxId; hidden: boolean; minH: number };
export type GridCol = { w: number; boxes: GridBox[] };
export type GridRow = { cols: GridCol[] };
export type Grid = { rows: GridRow[] };

const BoxSchema = z.object({
  id: z.union([z.enum(BOX_IDS), z.string().regex(TEXT_ID).transform((s) => s as TextBoxId)]),
  hidden: z.boolean().catch(false),
  /** Stretched height in CSS px; 0 = as tall as the content. */
  minH: z.number().int().min(0).max(2000).catch(0),
});
const ColSchema = z.object({
  w: z.number().int().min(1).max(12).catch(6),
  boxes: z.array(BoxSchema).max(BOX_IDS.length + MAX_TEXTS).catch([]),
});
export const GridSchema = z
  .object({ rows: z.array(z.object({ cols: z.array(ColSchema).max(MAX_COLS).catch([]) })).max(MAX_ROWS).catch([]) })
  .nullable()
  .catch(null);

const box = (id: BoxId, hidden = false): GridBox => ({ id, hidden, minH: 0 });

/** The three ready-made arrangements. Box order and hidden flags come from `from`. */
export function presetGrid(kind: "left" | "right" | "single", from?: Grid): Grid {
  const all = from ? flatBoxes(from) : BOX_IDS.map((id) => box(id));
  const tip = all.find((b) => b.id === "tip") ?? box("tip");
  const rest = all.filter((b) => b.id !== "tip").map((b) => ({ ...b, minH: 0 }));
  const tipCol = { w: 5, boxes: [{ ...tip, minH: 0 }] };
  const restCol = { w: 7, boxes: rest };
  if (kind === "single") return { rows: [{ cols: [{ w: 8, boxes: [{ ...tip, minH: 0 }, ...rest] }] }] };
  return { rows: [{ cols: kind === "right" ? [restCol, tipCol] : [tipCol, restCol] }] };
}

/** Pages saved before free layout: split / split-right / single plus a section list. */
export function legacyGrid(c: {
  layout: "split" | "split-right" | "single";
  sections: Array<{ id: Exclude<BoxId, "tip">; visible: boolean }>;
}): Grid {
  const from: Grid = { rows: [{ cols: [{ w: 12, boxes: [box("tip"), ...c.sections.map((s) => box(s.id, !s.visible))] }] }] };
  return presetGrid(c.layout === "split-right" ? "right" : c.layout === "single" ? "single" : "left", from);
}

export function flatBoxes(g: Grid): GridBox[] {
  return g.rows.flatMap((r) => r.cols.flatMap((c) => c.boxes));
}

/**
 * Every box exactly once, no empty columns or rows, each row at most 12 wide with
 * columns at least MIN_W. The tip box can't be hidden: it is what the page is for.
 * `texts`: the text boxes that exist; others are dropped and new ones added at the end.
 * Left out, the text boxes already in the grid stay as they are.
 */
export function normalizeGrid(g: Grid, texts?: readonly string[]): Grid {
  const seen = new Set<BoxId>();
  let rows: GridRow[] = g.rows
    .map((r) => ({
      cols: r.cols
        .map((c) => ({
          w: c.w,
          boxes: c.boxes
            .filter((b) => {
              if (seen.has(b.id)) return false;
              if (texts && isTextBox(b.id) && !texts.includes(b.id)) return false;
              seen.add(b.id);
              return true;
            })
            .map((b) => (b.id === "tip" ? { ...b, hidden: false } : b)),
        }))
        .filter((c) => c.boxes.length > 0)
        .slice(0, MAX_COLS),
    }))
    .filter((r) => r.cols.length > 0)
    .slice(0, MAX_ROWS);

  const missing: BoxId[] = [...BOX_IDS, ...(texts ?? []).filter(isTextBox)].filter((id) => !seen.has(id));
  if (!rows.length) {
    const base = presetGrid("left");
    const extra = (texts ?? []).filter(isTextBox).map((id) => box(id));
    base.rows[0].cols[1].boxes.push(...extra);
    return base;
  }
  for (const id of missing) {
    if (id === "tip") rows[0].cols[0].boxes.unshift(box("tip"));
    else rows.at(-1)!.cols.at(-1)!.boxes.push(box(id));
  }
  rows = rows.map((r) => ({ cols: fitWidths(r.cols) }));
  return { rows };
}

function fitWidths(cols: GridCol[]): GridCol[] {
  const out = cols.map((c) => ({ ...c, w: Math.max(Math.min(MIN_W, 12), Math.min(12, Math.round(c.w))) }));
  // Too wide: take from the widest column until it fits.
  while (out.reduce((s, c) => s + c.w, 0) > 12) {
    const widest = out.reduce((a, c) => (c.w > a.w ? c : a));
    if (widest.w <= MIN_W) break;
    widest.w -= 1;
  }
  return out;
}

export type Drop =
  | { kind: "before" | "after"; target: BoxId }
  | { kind: "left" | "right"; target: BoxId }
  | { kind: "row"; index: number };

/** Moves a box. Returns the grid unchanged when the drop makes no sense. */
export function moveBox(g: Grid, id: BoxId, drop: Drop): Grid {
  if (drop.kind !== "row" && drop.target === id) return g;
  const moving = flatBoxes(g).find((b) => b.id === id);
  if (!moving) return g;

  // Take it out; a column left empty gives its width to a neighbour.
  let rows: GridRow[] = g.rows.map((r) => {
    const cols = r.cols.map((c) => ({ ...c, boxes: c.boxes.filter((b) => b.id !== id) }));
    const emptied = cols.findIndex((c) => c.boxes.length === 0);
    if (emptied >= 0 && cols.length > 1) {
      const n = emptied > 0 ? emptied - 1 : 1;
      cols[n] = { ...cols[n], w: cols[n].w + cols[emptied].w };
    }
    return { cols: cols.filter((c) => c.boxes.length > 0) };
  });
  if (drop.kind === "row") {
    // Rows emptied above are still in the list here, so the index means what it did.
    const at = Math.max(0, Math.min(rows.length, drop.index));
    rows.splice(at, 0, { cols: [{ w: 12, boxes: [moving] }] });
    return normalizeGrid({ rows: rows.filter((r) => r.cols.length > 0) });
  }

  rows = rows.filter((r) => r.cols.length > 0);
  for (const r of rows) {
    for (let ci = 0; ci < r.cols.length; ci++) {
      const c = r.cols[ci];
      const bi = c.boxes.findIndex((b) => b.id === drop.target);
      if (bi < 0) continue;
      if (drop.kind === "before" || drop.kind === "after") {
        c.boxes.splice(drop.kind === "before" ? bi : bi + 1, 0, moving);
      } else {
        if (r.cols.length >= MAX_COLS) {
          c.boxes.splice(bi + 1, 0, moving);
        } else {
          // Split the target column's width with the new one when there is room.
          const free = 12 - r.cols.reduce((s, x) => s + x.w, 0);
          let w = Math.max(MIN_W, Math.floor(c.w / 2));
          if (free >= MIN_W) w = Math.min(Math.max(free, MIN_W), 6);
          else c.w = Math.max(MIN_W, c.w - w);
          r.cols.splice(drop.kind === "left" ? ci : ci + 1, 0, { w, boxes: [moving] });
        }
      }
      return normalizeGrid({ rows });
    }
  }
  return g;
}

/** Drag a column's right edge: trades width with the next column, or grows the row. */
export function resizeCol(g: Grid, row: number, col: number, w: number): Grid {
  const r = g.rows[row];
  if (!r?.cols[col]) return g;
  const cols = r.cols.map((c) => ({ ...c }));
  const next = cols[col + 1];
  if (next) {
    const pair = cols[col].w + next.w;
    const nw = Math.max(MIN_W, Math.min(pair - MIN_W, Math.round(w)));
    cols[col].w = nw;
    next.w = pair - nw;
  } else {
    const others = cols.reduce((s, c, i) => (i === col ? s : s + c.w), 0);
    cols[col].w = Math.max(MIN_W, Math.min(12 - others, Math.round(w)));
  }
  return { rows: g.rows.map((x, i) => (i === row ? { cols } : x)) };
}

export function updateBox(g: Grid, id: BoxId, patch: Partial<Omit<GridBox, "id">>): Grid {
  return normalizeGrid({
    rows: g.rows.map((r) => ({ cols: r.cols.map((c) => ({ ...c, boxes: c.boxes.map((b) => (b.id === id ? { ...b, ...patch } : b)) })) })),
  });
}
