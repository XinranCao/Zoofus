import { MAX_STROKE_CHARS } from "./journal.schema";

/**
 * A pen stroke is stored as a short string, not an array of numbers: the first point in tenths of
 * a page unit, then each next point as the (signed) step from the one before, all in base 36:
 *   "x0 y0 dx dy dx dy ..."
 * A 300-point line is about 1 KB. Points are simplified first, so a slow hand costs no more.
 */
const Q = 10; // tenths

const enc = (v: number) => Math.round(v * Q).toString(36);

export function encodeStroke(points: number[]): string {
  if (points.length < 2) return "";
  const out: string[] = [enc(points[0]!), enc(points[1]!)];
  let px = Math.round(points[0]! * Q);
  let py = Math.round(points[1]! * Q);
  for (let i = 2; i < points.length; i += 2) {
    const x = Math.round(points[i]! * Q);
    const y = Math.round(points[i + 1]! * Q);
    out.push((x - px).toString(36), (y - py).toString(36));
    px = x;
    py = y;
  }
  return out.join(" ");
}

/** Flat `[x, y, x, y, ...]` in page units; garbage in gives an empty list, never an exception. */
export function decodeStroke(pts: string): number[] {
  const parts = pts.trim().split(/\s+/);
  if (parts.length < 2 || parts.length % 2 !== 0) return [];
  const nums = parts.map((p) => parseInt(p, 36));
  if (nums.some((v) => Number.isNaN(v))) return [];
  const out: number[] = [];
  let x = nums[0]!;
  let y = nums[1]!;
  out.push(x / Q, y / Q);
  for (let i = 2; i < nums.length; i += 2) {
    x += nums[i]!;
    y += nums[i + 1]!;
    out.push(x / Q, y / Q);
  }
  return out;
}

/** Ramer–Douglas–Peucker on a flat point list, with `epsilon` in page units. */
export function simplify(points: number[], epsilon: number): number[] {
  const count = points.length / 2;
  if (count < 3) return points.slice();
  const keep = new Uint8Array(count);
  keep[0] = keep[count - 1] = 1;
  const stack: [number, number][] = [[0, count - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let worst = 0;
    let at = -1;
    const ax = points[a * 2]!;
    const ay = points[a * 2 + 1]!;
    const bx = points[b * 2]!;
    const by = points[b * 2 + 1]!;
    for (let i = a + 1; i < b; i++) {
      const d = distToSegment(points[i * 2]!, points[i * 2 + 1]!, ax, ay, bx, by);
      if (d > worst) {
        worst = d;
        at = i;
      }
    }
    if (at !== -1 && worst > epsilon) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  const out: number[] = [];
  for (let i = 0; i < count; i++)
    if (keep[i]) out.push(points[i * 2]!, points[i * 2 + 1]!);
  return out;
}

export function distToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Does the point (px, py) touch the polyline within `radius`? Used by the eraser. */
export function touchesStroke(
  points: number[],
  px: number,
  py: number,
  radius: number,
): boolean {
  if (points.length === 2) return Math.hypot(points[0]! - px, points[1]! - py) <= radius;
  for (let i = 0; i + 3 < points.length; i += 2) {
    if (
      distToSegment(px, py, points[i]!, points[i + 1]!, points[i + 2]!, points[i + 3]!) <=
      radius
    )
      return true;
  }
  return false;
}

/**
 * Turn a drawn line into one or more strokes that each fit the stored length. A very long line is
 * cut into pieces that share an end point, so it looks continuous.
 */
export function strokesFromLine(points: number[], epsilon = 0.8): string[] {
  const simple = simplify(points, epsilon);
  if (simple.length < 4) {
    // a dot: two identical points so it still draws
    return simple.length === 2
      ? [encodeStroke([simple[0]!, simple[1]!, simple[0]!, simple[1]!])]
      : [];
  }
  const out: string[] = [];
  let start = 0;
  while (start < simple.length - 2) {
    let end = start + 4;
    let best = encodeStroke(simple.slice(start, end));
    while (end + 2 <= simple.length) {
      const next = encodeStroke(simple.slice(start, end + 2));
      if (next.length > MAX_STROKE_CHARS - 40) break;
      best = next;
      end += 2;
    }
    out.push(best);
    start = end - 2; // the pieces share a point
  }
  return out;
}

export function strokeBounds(points: number[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    minX = Math.min(minX, points[i]!);
    maxX = Math.max(maxX, points[i]!);
    minY = Math.min(minY, points[i + 1]!);
    maxY = Math.max(maxY, points[i + 1]!);
  }
  return { minX, minY, maxX, maxY };
}

/** Add points so no step is longer than `step` (a long straight segment can then be cut anywhere). */
export function densify(points: number[], step: number): number[] {
  if (points.length < 4) return points.slice();
  const out: number[] = [points[0]!, points[1]!];
  for (let i = 2; i < points.length; i += 2) {
    const x0 = points[i - 2]!;
    const y0 = points[i - 1]!;
    const x1 = points[i]!;
    const y1 = points[i + 1]!;
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step);
    for (let k = 1; k <= n; k++)
      out.push(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n);
  }
  return out;
}

/**
 * Rub out the part of some lines that lies within `radius` of the eraser's step from (ax, ay) to
 * (bx, by). Each line is a list of pieces (an untouched line is one piece); what is left of a line
 * is the pieces on either side of the rubbed part. Pieces too short to see are dropped.
 */
export function erasePieces(
  pieces: number[][],
  ax: number,
  ay: number,
  bx: number,
  by: number,
  radius: number,
): number[][] {
  const out: number[][] = [];
  const loX = Math.min(ax, bx) - radius;
  const hiX = Math.max(ax, bx) + radius;
  const loY = Math.min(ay, by) - radius;
  const hiY = Math.max(ay, by) + radius;
  for (const piece of pieces) {
    const b = strokeBounds(piece);
    if (b.maxX < loX || b.minX > hiX || b.maxY < loY || b.minY > hiY) {
      out.push(piece);
      continue;
    }
    const dense = densify(piece, Math.max(0.75, radius / 3));
    let run: number[] = [];
    let cut = false;
    for (let i = 0; i < dense.length; i += 2) {
      const x = dense[i]!;
      const y = dense[i + 1]!;
      if (distToSegment(x, y, ax, ay, bx, by) <= radius) {
        cut = true;
        if (run.length >= 4) out.push(run);
        run = [];
      } else run.push(x, y);
    }
    if (!cut) out.push(piece);
    else if (run.length >= 4) out.push(run);
  }
  return out;
}
