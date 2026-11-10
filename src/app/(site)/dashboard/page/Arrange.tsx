"use client";
import { useRef, useState } from "react";
import type { Dict } from "@moom/shared/i18n";
import { isTextBox, moveBox, resizeCol, updateBox, type BoxId, type Drop, type Grid } from "@/lib/page-grid";
import type { TextBox } from "@/lib/page-config";
import { boxName } from "./box-name";
import type { StoreEdit } from "../../s/[slug]/StoreView";

type Line = { left: number; top: number; width: number; height: number };

/**
 * Move / resize / hide for the boxes of the tip page, done right on the live preview.
 * Positions are read from the DOM in screen pixels, so the preview's zoom doesn't matter
 * except for heights, which are stored in the page's own pixels.
 */
export function useArrange({
  d,
  grid,
  texts,
  wide,
  update,
}: {
  d: Dict;
  grid: Grid;
  texts: TextBox[];
  /** Columns only exist on a wide page; a phone-width preview just stacks. */
  wide: boolean;
  update: (fn: (g: Grid) => Grid) => void;
}) {
  const [dragging, setDragging] = useState<BoxId | null>(null);
  const [line, setLine] = useState<Line | null>(null);
  const raf = useRef(0);
  const later = (fn: () => void) => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(fn);
  };

  const track = (e: React.PointerEvent, onMove: (ev: PointerEvent) => void, onUp: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    const up = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      onUp();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const startMove = (id: BoxId) => (e: React.PointerEvent<HTMLElement>) => {
    const root = e.currentTarget.closest<HTMLElement>(".moom-page");
    if (!root) return;
    let drop: Drop | null = null;
    setDragging(id);
    track(
      e,
      (ev) => {
        const found = findDrop(root, id, ev.clientX, ev.clientY, wide);
        drop = found?.drop ?? null;
        later(() => setLine(found?.line ?? null));
      },
      () => {
        cancelAnimationFrame(raf.current);
        setDragging(null);
        setLine(null);
        const dr = drop;
        if (dr) update((g) => moveBox(g, id, dr));
      },
    );
  };

  const startWidth = (row: number, col: number, lastCol: boolean) => (e: React.PointerEvent<HTMLElement>) => {
    const colEl = e.currentTarget.closest<HTMLElement>(".moom-page__col");
    const w = grid.rows[row]?.cols[col]?.w;
    if (!colEl || !w) return;
    const unit = colEl.getBoundingClientRect().width / w;
    const x0 = e.clientX;
    // A row narrower than the page is centred, so its right edge moves half as far.
    const factor = lastCol ? 2 : 1;
    track(
      e,
      (ev) => {
        const nw = w + ((ev.clientX - x0) * factor) / unit;
        later(() => update((g) => resizeCol(g, row, col, nw)));
      },
      () => {},
    );
  };

  const startHeight = (id: BoxId) => (e: React.PointerEvent<HTMLElement>) => {
    const boxEl = e.currentTarget.closest<HTMLElement>("[data-box]");
    const zoom = Number(e.currentTarget.closest<HTMLElement>("[data-zoom]")?.dataset.zoom) || 1;
    if (!boxEl) return;
    const h0 = boxEl.getBoundingClientRect().height;
    const y0 = e.clientY;
    track(
      e,
      (ev) => {
        const h = Math.max(0, Math.round((h0 + ev.clientY - y0) / zoom / 8) * 8);
        later(() => update((g) => updateBox(g, id, { minH: h })));
      },
      () => {},
    );
  };

  const name = (id: BoxId) => boxName(d, id, texts);

  const edit: StoreEdit = {
    box: (b, node, at) => (
      <div className={`relative grid ${dragging === b.id ? "opacity-40" : ""}`}>
        {/* The real box, untouchable while arranging so a click never types or buys. */}
        <div className={`pointer-events-none grid select-none ${b.hidden ? "opacity-35 grayscale" : ""}`} inert>
          {node}
        </div>
        <div className="pointer-events-none absolute -inset-1.5 outline-2 outline-[var(--accent)] outline-dashed" />
        <div className="absolute -top-3.5 left-2 z-10 flex flex-wrap gap-1">
          <button
            type="button"
            onPointerDown={startMove(b.id)}
            title={d.page.dragMove}
            className="px-btn px-btn-sm px-btn-primary flex cursor-grab touch-none items-center gap-1.5 active:cursor-grabbing"
          >
            <Grip />
            {name(b.id)}
          </button>
          {b.id !== "tip" && (
            <button
              type="button"
              onClick={() => update((g) => updateBox(g, b.id, { hidden: !b.hidden }))}
              aria-pressed={b.hidden}
              className="px-btn px-btn-sm"
            >
              {b.hidden ? d.page.boxShow : d.page.boxHide}
            </button>
          )}
          {b.hidden && <span className="px-tag self-center bg-paper">{d.page.boxHidden}</span>}
        </div>
        {wide && (
          <div
            onPointerDown={startWidth(at.row, at.col, at.lastCol)}
            title={d.page.dragWidth}
            className="absolute top-1/2 -right-3 z-10 h-14 w-3 -translate-y-1/2 cursor-ew-resize touch-none border-2 border-ink bg-[var(--accent)]"
          />
        )}
        <div
          onPointerDown={startHeight(b.id)}
          onDoubleClick={() => update((g) => updateBox(g, b.id, { minH: 0 }))}
          title={d.page.dragHeight}
          className="absolute -bottom-3 left-1/2 z-10 h-3 w-14 -translate-x-1/2 cursor-ns-resize touch-none border-2 border-ink bg-[var(--accent)]"
        />
      </div>
    ),
    empty: (id) => (
      <div className="px-frame grid min-h-28 place-items-center bg-paper-2 p-4 pt-6 text-center text-sm text-ink-soft">
        <p className="max-w-xs">{isTextBox(id) ? d.page.textEmpty : d.page.boxEmpty[id]}</p>
      </div>
    ),
  };

  const overlay = line && (
    <div className="pointer-events-none fixed z-[90]" style={{ ...line, background: "var(--accent, #2f7a6a)" }} />
  );

  return { edit, overlay, dragging };
}

/** Where a box would land if dropped at (x, y), and the line that shows it. */
function findDrop(root: HTMLElement, id: BoxId, x: number, y: number, wide: boolean): { drop: Drop; line: Line } | null {
  const T = 6;
  const inside = (r: DOMRect) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  const around = (target: BoxId, r: DOMRect): { drop: Drop; line: Line } => {
    const fx = (x - r.left) / r.width;
    const fy = (y - r.top) / r.height;
    if (wide && fx < 0.22) return { drop: { kind: "left", target }, line: { left: r.left - T - 4, top: r.top, width: T, height: r.height } };
    if (wide && fx > 0.78) return { drop: { kind: "right", target }, line: { left: r.right + 4, top: r.top, width: T, height: r.height } };
    return fy < 0.5
      ? { drop: { kind: "before", target }, line: { left: r.left, top: r.top - T - 4, width: r.width, height: T } }
      : { drop: { kind: "after", target }, line: { left: r.left, top: r.bottom + 4, width: r.width, height: T } };
  };

  for (const el of root.querySelectorAll<HTMLElement>("[data-box]")) {
    const r = el.getBoundingClientRect();
    if (!inside(r)) continue;
    const target = el.dataset.box as BoxId;
    return target === id ? null : around(target, r);
  }
  if (!wide) return null;

  const rows = [...root.querySelectorAll<HTMLElement>("[data-row]")];
  for (const row of rows) {
    const r = row.getBoundingClientRect();
    if (y < r.top) {
      return { drop: { kind: "row", index: Number(row.dataset.row) }, line: { left: r.left, top: r.top - 15, width: r.width, height: T } };
    }
    if (y <= r.bottom) {
      // Beside a short column: lands under its last box.
      for (const col of row.querySelectorAll<HTMLElement>(".moom-page__col")) {
        const c = col.getBoundingClientRect();
        if (x < c.left || x > c.right) continue;
        const boxes = col.querySelectorAll<HTMLElement>("[data-box]");
        const last = boxes[boxes.length - 1];
        if (!last || last.dataset.box === id) return null;
        const lr = last.getBoundingClientRect();
        return { drop: { kind: "after", target: last.dataset.box as BoxId }, line: { left: lr.left, top: lr.bottom + 4, width: lr.width, height: T } };
      }
      return null;
    }
  }
  const last = rows.at(-1);
  if (!last) return null;
  const r = last.getBoundingClientRect();
  return { drop: { kind: "row", index: Number(last.dataset.row) + 1 }, line: { left: r.left, top: r.bottom + 9, width: r.width, height: T } };
}

/** Six pixel dots: the "grab here" mark. */
function Grip() {
  return (
    <svg width="8" height="12" viewBox="0 0 8 12" aria-hidden className="shrink-0" shapeRendering="crispEdges">
      {[0, 5].map((x) => [0, 5, 10].map((y) => <rect key={`${x}-${y}`} x={x} y={y} width="3" height="2" fill="currentColor" />))}
    </svg>
  );
}
