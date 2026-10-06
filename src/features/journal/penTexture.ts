import type { StrokeTool } from "./journal.schema";

/**
 * What a pencil, a marker and a crayon leave on paper. A vector line cannot look like any of them,
 * so each stroke is painted once into a small canvas: a solid path, then paper "tooth" rubbed
 * out of it with a grain that is fixed to the page (two strokes over the same spot show the same
 * tooth, as on real paper, and a stroke that grows while you draw does not shimmer).
 */

/** How wide each tool draws, as a multiple of the chosen size. */
export const PEN_WIDTH: Record<StrokeTool, number> = {
  pen: 1,
  pencil: 0.8,
  marker: 2.6,
  crayon: 1.7,
};
/** The textured tools; a pen stays a crisp vector line. */
export const isTextured = (tool: StrokeTool) => tool !== "pen";

export interface Layout {
  /** Top left of the canvas on the page, and its size, in page units. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The box a stroke needs: its points, its width and a little room for the ragged edge. */
export function layoutOf(points: number[], width: number): Layout | null {
  if (points.length < 2) return null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    x0 = Math.min(x0, points[i]!);
    x1 = Math.max(x1, points[i]!);
    y0 = Math.min(y0, points[i + 1]!);
    y1 = Math.max(y1, points[i + 1]!);
  }
  const pad = Math.ceil(width / 2 + 3);
  const x = Math.floor(x0 - pad);
  const y = Math.floor(y0 - pad);
  return { x, y, w: Math.ceil(x1 + pad) - x, h: Math.ceil(y1 + pad) - y };
}

/** Pixels per page unit for a stroke's canvas: sharper when it is small, lighter when it is big. */
export function ratioFor(layout: Layout, live: boolean): number {
  if (live) return 1;
  const area = layout.w * layout.h;
  return area <= 160_000 ? 2 : area <= 900_000 ? 1.5 : 1;
}

/** A small seeded random generator, so a tile of grain is the same every time. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TILE = 256; // page units across
const TILE_PX = 2; // pixels per unit inside the tile

interface Grain {
  /** Specks per tile, their radius range (units) and strength. */
  specks: number;
  min: number;
  max: number;
  alpha: number;
  seed: number;
}
const GRAINS: Partial<Record<StrokeTool, Grain>> = {
  // graphite catching only the high points of the paper: fine and dense
  pencil: { specks: 26000, min: 0.25, max: 0.7, alpha: 0.95, seed: 11 },
  // wax skipping over the paper: bigger holes
  crayon: { specks: 15000, min: 0.35, max: 1.5, alpha: 0.95, seed: 23 },
  // ink soaking in: barely there
  marker: { specks: 5000, min: 0.3, max: 0.9, alpha: 0.35, seed: 37 },
};
const tiles = new Map<StrokeTool, HTMLCanvasElement | null>();

function tileFor(tool: StrokeTool): HTMLCanvasElement | null {
  if (tiles.has(tool)) return tiles.get(tool)!;
  const grain = GRAINS[tool];
  let out: HTMLCanvasElement | null = null;
  if (grain && typeof document !== "undefined") {
    const c = document.createElement("canvas");
    c.width = c.height = TILE * TILE_PX;
    const g = c.getContext("2d");
    if (g) {
      g.scale(TILE_PX, TILE_PX);
      g.fillStyle = "#000";
      const rnd = seeded(grain.seed);
      for (let i = 0; i < grain.specks; i++) {
        const r = grain.min + rnd() * (grain.max - grain.min);
        const x = rnd() * TILE;
        const y = rnd() * TILE;
        g.globalAlpha = grain.alpha * (0.35 + rnd() * 0.65);
        // draw it again on the far side, so the tile repeats without a seam
        for (const [ox, oy] of [
          [0, 0],
          [x < r ? TILE : x > TILE - r ? -TILE : 0, 0],
          [0, y < r ? TILE : y > TILE - r ? -TILE : 0],
        ] as const) {
          g.beginPath();
          g.arc(x + ox, y + oy, r, 0, Math.PI * 2);
          g.fill();
        }
      }
      out = c;
    }
  }
  tiles.set(tool, out);
  return out;
}

/** Smooth the path through the points (quadratic curves through the midpoints). */
function trace(g: CanvasRenderingContext2D, pts: number[], dx = 0, dy = 0) {
  g.beginPath();
  g.moveTo(pts[0]! + dx, pts[1]! + dy);
  if (pts.length === 2) {
    g.lineTo(pts[0]! + dx + 0.01, pts[1]! + dy);
    return;
  }
  for (let i = 2; i + 2 < pts.length; i += 2) {
    const mx = (pts[i]! + pts[i + 2]!) / 2;
    const my = (pts[i + 1]! + pts[i + 3]!) / 2;
    g.quadraticCurveTo(pts[i]! + dx, pts[i + 1]! + dy, mx + dx, my + dy);
  }
  g.lineTo(pts[pts.length - 2]! + dx, pts[pts.length - 1]! + dy);
}

/** Rub the paper's tooth out of what is drawn so far. */
function rub(
  g: CanvasRenderingContext2D,
  tool: StrokeTool,
  layout: Layout,
  strength: number,
  shift: number,
) {
  const tile = tileFor(tool);
  if (!tile) return;
  const pattern = g.createPattern(tile, "repeat");
  if (!pattern) return;
  g.save();
  g.globalCompositeOperation = "destination-out";
  g.globalAlpha = strength;
  // the grain belongs to the page, not to this canvas
  g.translate(-layout.x + shift, -layout.y + shift * 0.7);
  pattern.setTransform?.(new DOMMatrix().scale(1 / TILE_PX));
  g.fillStyle = pattern;
  g.fillRect(layout.x - shift, layout.y - shift * 0.7, layout.w + 2, layout.h + 2);
  g.restore();
}

/** Thin lines along the stroke at these fractions of its width (the direction a pencil or marker drags). */
function streaks(
  g: CanvasRenderingContext2D,
  pts: number[],
  width: number,
  offsets: number[],
  thin: number,
) {
  g.lineCap = "round";
  g.lineJoin = "round";
  for (const o of offsets) {
    // shift sideways by following the stroke's own normal, point by point
    const moved: number[] = [];
    for (let i = 0; i < pts.length; i += 2) {
      const a = Math.max(0, i - 2);
      const b = Math.min(pts.length - 2, i + 2);
      const tx = pts[b]! - pts[a]!;
      const ty = pts[b + 1]! - pts[a + 1]!;
      const len = Math.hypot(tx, ty) || 1;
      moved.push(pts[i]! - (ty / len) * o * width, pts[i + 1]! + (tx / len) * o * width);
    }
    g.lineWidth = Math.max(0.6, width * thin);
    trace(g, moved);
    g.stroke();
  }
}

/** Paint a stroke into a new canvas at `ratio` pixels per unit; null where canvas is not available. */
export function paintStroke(
  tool: StrokeTool,
  points: number[],
  size: number,
  colour: string,
  layout: Layout,
  ratio: number,
): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(layout.w * ratio));
  c.height = Math.max(1, Math.ceil(layout.h * ratio));
  const g = c.getContext("2d");
  if (!g) return null;
  const width = size * PEN_WIDTH[tool];
  // the same canvas for every tool: a page-unit grid with the stroke's box at its top left
  g.scale(ratio, ratio);
  g.translate(-layout.x, -layout.y);
  g.lineCap = "round";
  g.lineJoin = "round";
  g.strokeStyle = colour;
  g.fillStyle = colour;
  g.lineWidth = width;
  // back to canvas space for rubbing (it brings its own translate)
  const rubbing = (strength: number, shift = 0) => {
    g.save();
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    rub(g, tool, layout, strength, shift);
    g.restore();
  };

  if (tool === "pencil") {
    // a soft grey body, a few darker threads of graphite where the lead pressed, grain over all
    g.globalAlpha = 0.62;
    trace(g, points);
    g.stroke();
    g.globalAlpha = 0.7;
    streaks(g, points, width, [-0.3, 0.02, 0.28], 0.3);
    rubbing(0.62);
    rubbing(0.2, 1.3);
  } else if (tool === "crayon") {
    // wax: a heavy body with a ragged edge (two slightly wandering passes) and big holes
    g.globalAlpha = 0.95;
    trace(g, points);
    g.stroke();
    g.lineWidth = width * 0.9;
    trace(g, points, width * 0.06, -width * 0.05);
    g.stroke();
    streaks(g, points, width, [-0.32, 0.3], 0.3);
    rubbing(0.55);
    rubbing(0.3, 2.1);
  } else if (tool === "marker") {
    // one even coat of ink (a single path, so an overlap does not double), darker where it pooled
    // at the edges, with a faint dry streak and a hint of the paper's tooth
    g.globalAlpha = 1;
    trace(g, points);
    g.stroke();
    g.save();
    g.globalCompositeOperation = "destination-out";
    g.strokeStyle = "#000";
    g.globalAlpha = 0.32;
    g.lineWidth = width * 0.74;
    trace(g, points);
    g.stroke();
    g.globalAlpha = 0.07;
    streaks(g, points, width, [0.14], 0.12);
    g.restore();
    rubbing(0.3);
  } else {
    trace(g, points);
    g.stroke();
  }
  return c;
}

/** Give a canvas's memory back at once (a canvas holds its pixels until it is collected). */
export function releaseCanvas(c: HTMLCanvasElement | null) {
  if (c) {
    c.width = 0;
    c.height = 0;
  }
}

/** How see-through each tool is when it is put on the page. */
export const PEN_ALPHA: Record<StrokeTool, number> = {
  pen: 1,
  pencil: 0.92,
  marker: 0.62,
  crayon: 1,
};
