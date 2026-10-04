import type { MultiPolygon } from "polygon-clipping";
import { maskBounds } from "./cutout";

/**
 * A sticker's lasso outline, kept as a short piece of text instead of a second picture.
 *
 * The finished sticker already contains the cut-out (the edge is drawn around it), so to redo the
 * edge later all that is needed is *where the cut-out is* inside that picture and *its shape*:
 * the outline. The picture is cropped to the cut-out and masked by the outline, and that is the
 * edge-less source again. A freehand lasso simplifies to a few hundred points, a few KB of text,
 * where the second picture was hundreds of KB.
 *
 * Text format: `WxH|x,y x,y x,y;x,y x,y ...` where W×H is the cut-out's size in pixels, every
 * ring after it (the outer edge and any holes; filled even-odd) is a list of points in those
 * pixels, and rings are separated by `;`.
 */
export type Ring = [number, number][];

export interface Outline {
  width: number;
  height: number;
  rings: Ring[];
}

/** Where the cut-out sits inside the stored finished picture, in that picture's pixels. */
export interface CutRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Most points kept in total; a rougher simplification is used when a lasso has more. */
export const MAX_OUTLINE_POINTS = 1500;
/** Longest text the security rules accept. */
export const MAX_OUTLINE_CHARS = 30000;

/** Douglas–Peucker: drop points that sit within `tol` of the line between their neighbours. */
export function simplifyRing(ring: Ring, tol: number): Ring {
  const n = ring.length;
  if (n <= 3) return ring;
  const keep = new Array<boolean>(n).fill(false);
  keep[0] = true;
  keep[n - 1] = true;
  const stack: [number, number][] = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = ring[a]!;
    const [bx, by] = ring[b]!;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    let far = -1;
    let farD = tol;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = ring[i]!;
      const d =
        len === 0
          ? Math.hypot(px - ax, py - ay)
          : Math.abs(dy * (px - ax) - dx * (py - ay)) / len;
      if (d > farD) {
        farD = d;
        far = i;
      }
    }
    if (far >= 0) {
      keep[far] = true;
      stack.push([a, far], [far, b]);
    }
  }
  return ring.filter((_, i) => keep[i]);
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * The outline of a mask (in the photo's pixels) as text, in the pixels of the cut-out picture
 * (`width` × `height`), which was made by cropping the photo to the mask's box and scaling.
 */
export function encodeOutline(
  mask: MultiPolygon,
  width: number,
  height: number,
): string | null {
  const box = maskBounds(mask);
  if (!box) return null;
  const kx = width / box.width;
  const ky = height / box.height;
  const all: Ring[] = [];
  for (const poly of mask)
    for (const ring of poly) {
      // the closing point repeats the first: drop it
      const pts =
        ring.length > 1 && same(ring[0]!, ring[ring.length - 1]!)
          ? ring.slice(0, -1)
          : ring;
      if (pts.length >= 3)
        all.push(
          pts.map(([x, y]) => [(x - box.x) * kx, (y - box.y) * ky] as [number, number]),
        );
    }
  let tol = 0.7;
  let rings = all.map((r) => simplifyRing(r, tol));
  const total = () => rings.reduce((s, r) => s + r.length, 0);
  const text = () =>
    `${width}x${height}|` +
    rings.map((r) => r.map(([x, y]) => `${r1(x)},${r1(y)}`).join(" ")).join(";");
  while (
    (total() > MAX_OUTLINE_POINTS || text().length > MAX_OUTLINE_CHARS) &&
    tol < 40
  ) {
    tol *= 1.6;
    rings = all.map((r) => simplifyRing(r, tol));
  }
  rings = rings.filter((r) => r.length >= 3);
  return rings.length ? text() : null;
}

const same = (a: [number, number], b: [number, number]) => a[0] === b[0] && a[1] === b[1];

/** The text back into rings, or null when it is not a valid outline. */
export function decodeOutline(text: string | undefined): Outline | null {
  if (!text) return null;
  const bar = text.indexOf("|");
  const m = /^(\d+)x(\d+)$/.exec(bar < 0 ? "" : text.slice(0, bar));
  if (!m) return null;
  const rings: Ring[] = [];
  for (const part of text.slice(bar + 1).split(";")) {
    const ring: Ring = [];
    for (const pair of part.split(" ")) {
      const [x, y] = pair.split(",").map(Number);
      if (Number.isFinite(x) && Number.isFinite(y)) ring.push([x!, y!]);
    }
    if (ring.length >= 3) rings.push(ring);
  }
  const width = Number(m[1]);
  const height = Number(m[2]);
  return rings.length && width > 0 && height > 0 ? { width, height, rings } : null;
}

/**
 * Where the cut-out is inside the picture that gets stored. The finished sticker is the cut-out
 * (`srcW` × `srcH`) with the same margin on every side, and it may have been shrunk to fit the
 * stored size, so the margin is measured in the stored picture's pixels.
 */
export function cutRect(
  finishedW: number,
  finishedH: number,
  srcW: number,
  srcH: number,
  storedW: number,
  storedH: number,
): CutRect {
  const sx = storedW / finishedW;
  const sy = storedH / finishedH;
  return {
    x: Math.round(((finishedW - srcW) / 2) * sx),
    y: Math.round(((finishedH - srcH) / 2) * sy),
    w: Math.max(1, Math.round(srcW * sx)),
    h: Math.max(1, Math.round(srcH * sy)),
  };
}

/**
 * The edge-less source again: the stored sticker cropped to the cut-out and masked by its outline.
 * A thin rim just inside the outline is removed, where the old edge's colour blends into the
 * anti-aliased border.
 */
export function rebuildSource(
  picture: CanvasImageSource,
  cut: CutRect,
  outline: Outline,
  createCanvas: (w: number, h: number) => HTMLCanvasElement = (w, h) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  },
): HTMLCanvasElement {
  const canvas = createCanvas(outline.width, outline.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(picture, cut.x, cut.y, cut.w, cut.h, 0, 0, outline.width, outline.height);
  const path = new Path2D();
  for (const ring of outline.rings) {
    path.moveTo(ring[0]![0], ring[0]![1]);
    for (let i = 1; i < ring.length; i++) path.lineTo(ring[i]![0], ring[i]![1]);
    path.closePath();
  }
  ctx.globalCompositeOperation = "destination-in";
  ctx.fill(path, "evenodd");
  ctx.globalCompositeOperation = "destination-out";
  ctx.lineWidth = 1.4;
  ctx.stroke(path);
  return canvas;
}
