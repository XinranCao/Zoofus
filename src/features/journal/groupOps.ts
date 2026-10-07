import { MAX_JOURNAL_ITEMS, newId, type Item } from "./journal.schema";
import type { Op } from "./ops";
import { topZ } from "./ops";
import { decodeStroke, encodeStroke } from "./strokes";

/** A rectangle in page units. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const boxesTouch = (a: Box, b: Box) =>
  a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;

export const unionBox = (boxes: Box[]): Box | null => {
  if (boxes.length === 0) return null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const b of boxes) {
    x0 = Math.min(x0, b.x);
    y0 = Math.min(y0, b.y);
    x1 = Math.max(x1, b.x + b.w);
    y1 = Math.max(y1, b.y + b.h);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};

/** A move and a turn applied to a group: turn by `deg` about (cx, cy), then shift by (dx, dy). */
export interface GroupMove {
  cx: number;
  cy: number;
  dx: number;
  dy: number;
  deg: number;
}

/** Where a point goes under `m`. */
export function moveOf(m: GroupMove, x: number, y: number): [number, number] {
  const a = (m.deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const rx = x - m.cx;
  const ry = y - m.cy;
  return [m.cx + m.dx + rx * c - ry * s, m.cy + m.dy + rx * s + ry * c];
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const wrapDeg = (r: number) => {
  // the schema allows -720..720; keep a turned thing well inside it
  let v = r % 360;
  if (v > 180) v -= 360;
  if (v < -180) v += 360;
  return round1(v);
};

/** The item as it is after the group has moved. Pen strokes carry their points, so those are rewritten. */
export function movedItem(item: Item, m: GroupMove): Item {
  if (item.t === "p") {
    const pts = decodeStroke(item.pts);
    if (pts.length < 2) return item;
    const out: number[] = [];
    for (let i = 0; i < pts.length; i += 2) out.push(...moveOf(m, pts[i]!, pts[i + 1]!));
    return { ...item, pts: encodeStroke(out) };
  }
  const [x, y] = moveOf(m, item.x, item.y);
  return { ...item, x: round1(x), y: round1(y), r: wrapDeg(item.r + m.deg) };
}

export function moveOps(items: Item[], ids: readonly string[], m: GroupMove): Op[] {
  const set = new Set(ids);
  return items
    .filter((i) => set.has(i.id))
    .map((i) => ({ k: "put" as const, item: movedItem(i, m) }));
}

/** The clipboard: copies of items, in stacking order. */
export const copyOf = (items: Item[], ids: readonly string[]): Item[] => {
  const set = new Set(ids);
  return items.filter((i) => set.has(i.id)).sort((a, b) => a.z - b.z);
};

/**
 * Puts copies of `clip` on the page, each time a little further down and right so a copy never
 * hides its original. Returns the operations and the new ids (none if the page is full).
 */
export function pasteOps(
  items: Item[],
  clip: Item[],
  times: number,
): { ops: Op[]; ids: string[] } {
  const room = MAX_JOURNAL_ITEMS - items.length;
  if (clip.length === 0 || room < clip.length) return { ops: [], ids: [] };
  const d = 16 * Math.max(1, times);
  const base = topZ(items);
  const ops: Op[] = [];
  const ids: string[] = [];
  clip.forEach((it, n) => {
    const id = newId();
    ids.push(id);
    const shifted = movedItem(it, { cx: 0, cy: 0, dx: d, dy: d, deg: 0 });
    ops.push({ k: "put", item: { ...shifted, id, z: base + n } });
  });
  return { ops, ids };
}
