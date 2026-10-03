import { rng, vnoise } from "./random";

/**
 * Die-cut sticker (the product's core output). dieCut() is the SAME function for the on-screen
 * preview and the exported PNG: what you see is what you download. Users choose the edge shape
 * (smooth | wobbly | torn), the width, and the fill (a colour or a PatternSpec image).
 * No shadow, ever.
 */

export type EdgeShape = "smooth" | "wobbly" | "torn";
export const EDGE_SHAPES: readonly EdgeShape[] = ["smooth", "wobbly", "torn"];

type Canvas2D = HTMLCanvasElement | OffscreenCanvas;
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type CanvasSource = CanvasImageSource & { width: number; height: number };

export interface DieCutOptions {
  shape?: EdgeShape;
  /** Border width in px (see stickerBorder). 0 draws no edge. */
  border?: number;
  /** CSS colour of the edge when there is no `fill`. */
  color?: string;
  /** A pattern image sized to the output (see dieCutPad); overrides `color`. */
  fill?: CanvasImageSource | null;
  /** CSS colour of the torn lip (torn only). */
  fiber?: string;
  seed?: string;
  /** Canvas factory, so the same code can run in a Worker with OffscreenCanvas. */
  createCanvas?: (w: number, h: number) => Canvas2D;
}

/** Edge width for a sticker whose longest side is `size`, times the user's scale (0-1.6). */
export function stickerBorder(size: number, scale = 1): number {
  return Math.round(Math.min(28, Math.max(4, size * 0.045)) * scale);
}

interface EdgeSample {
  r: number;
  f: number;
}

/** The edge radius at angle `a` (0..1 around the sticker) for the given shape. */
export function edgeRadius(
  shape: EdgeShape,
  seed: string,
  bw: number,
): (a: number) => EdgeSample {
  const R = rng("die" + seed);
  if (shape === "smooth") {
    const s1 = vnoise(R, 5, true);
    return (a) => ({ r: bw * (0.94 + 0.12 * s1(a)), f: 0 });
  }
  if (shape === "torn") {
    const n1 = vnoise(R, 4 + Math.floor(R() * 4), true);
    const n2 = vnoise(R, 23 + Math.floor(R() * 10), true);
    const n3 = vnoise(R, 150, true);
    const rough = vnoise(R, 7, true);
    const fb = vnoise(R, 41, true);
    const nb = 1 + Math.floor(R() * 3);
    const bites: { a: number; w: number; lead: number }[] = [];
    for (let i = 0; i < nb; i++)
      bites.push({ a: R(), w: 0.012 + R() * 0.03, lead: 0.2 + R() * 0.6 });
    const grit: number[] = [];
    for (let g = 0; g < 1440; g++) grit.push(R());
    return (a) => {
      const rr = 0.35 + 0.9 * rough(a); // ragged in places, calmer in others
      let r =
        bw *
        (0.45 +
          0.6 * n1(a) +
          0.4 * n2(a) +
          rr * (0.55 * n3(a) + 0.35 * grit[Math.floor(a * 1439)]!) -
          0.2);
      for (const b of bites) {
        const x = (a - b.a) / b.w;
        if (x > -b.lead && x < 1 - b.lead) {
          const u = x < 0 ? 1 + x / b.lead : 1 - x / (1 - b.lead);
          r -= bw * 0.8 * Math.pow(u, 0.6);
        }
      }
      return {
        r: Math.max(bw * 0.15, r),
        f: bw * 0.4 * Math.max(0.1, fb(a) * 1.6 - 0.3),
      };
    };
  }
  const l1 = R() * 6.28;
  const l2 = R() * 6.28;
  const l3 = R() * 6.28; // wobbly
  return (a) => {
    const t = a * 6.283;
    return {
      r:
        bw *
        (1 +
          0.28 *
            (0.55 * Math.sin(3 * t + l1) +
              0.3 * Math.sin(5 * t + l2) +
              0.15 * Math.sin(9 * t + l3))),
      f: 0,
    };
  };
}

/** Transparent padding around the cut-out so the edge never clips. */
export function dieCutPad(bw: number): number {
  return Math.ceil(bw * 1.9 + 2);
}

const defaultCanvas = (w: number, h: number): Canvas2D => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

function ctxOf(c: Canvas2D): Ctx2D {
  const ctx = c.getContext("2d") as Ctx2D | null;
  if (!ctx) throw new Error("Canvas is not supported");
  return ctx;
}

/**
 * Cut a sticker: returns a transparent canvas with the edge baked in and no shadow.
 * The output is `src` plus `dieCutPad(border)` on every side.
 */
export function dieCut(src: CanvasSource, opts: DieCutOptions = {}): Canvas2D {
  const create = opts.createCanvas ?? defaultCanvas;
  const W = src.width;
  const H = src.height;
  const bw = opts.border ?? stickerBorder(Math.max(W, H));
  const shape = opts.shape ?? "wobbly";
  const pad = dieCutPad(bw);
  const out = create(W + pad * 2, H + pad * 2);
  const ctx = ctxOf(out);

  if (bw > 0) {
    // the silhouette of the cut-out, as a solid shape
    const sil = create(W, H);
    const s = ctxOf(sil);
    s.drawImage(src, 0, 0, W, H);
    s.globalCompositeOperation = "source-in";
    s.fillStyle = "#000";
    s.fillRect(0, 0, W, H);

    const rad = edgeRadius(shape, opts.seed ?? "", bw);
    const N = shape === "torn" ? 720 : Math.max(36, Math.round(bw * 4));
    // stamp the silhouette around the edge radius, three rings deep, to grow it into a mask
    const stamp = (withFiber: boolean) => {
      const c = create(out.width, out.height);
      const g = ctxOf(c);
      for (let ring = 1; ring <= 3; ring++) {
        for (let i = 0; i < N; i++) {
          const a = i / N;
          const e = rad(a);
          const r = ((e.r + (withFiber ? e.f : 0)) * ring) / 3;
          g.drawImage(sil, pad + Math.cos(a * 6.283) * r, pad + Math.sin(a * 6.283) * r);
        }
      }
      g.drawImage(sil, pad, pad);
      return c;
    };
    const paint = (c: Canvas2D, color: string, img?: CanvasImageSource | null) => {
      const g = ctxOf(c);
      g.globalCompositeOperation = "source-in";
      if (img) g.drawImage(img, 0, 0, c.width, c.height);
      else {
        g.fillStyle = color;
        g.fillRect(0, 0, c.width, c.height);
      }
      return c;
    };
    if (shape === "torn")
      ctx.drawImage(paint(stamp(true), opts.fiber ?? "#fbf6ee"), 0, 0);
    ctx.drawImage(paint(stamp(false), opts.color ?? "#fbf6ee", opts.fill), 0, 0);
  }
  ctx.drawImage(src, pad, pad, W, H);
  return out;
}
