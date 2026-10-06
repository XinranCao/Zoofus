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
  /**
   * Keep the grown edge shape for this same `src` canvas, so changing only the colour or print
   * (not the shape, width or size) costs two draws instead of thousands. The live preview uses
   * it; `src` must not be changed afterwards.
   */
  cacheMasks?: boolean;
}

/** Edge shapes grown for a source canvas, kept by `cacheMasks` (dropped with the source). */
const maskCache = new WeakMap<
  object,
  { key: string; plain: Canvas2D; fiber?: Canvas2D }
>();

/** Give back the grown edge kept for `src` (call when `src` is replaced or no longer shown). */
export function forgetMasks(src: object): void {
  const masks = maskCache.get(src);
  if (!masks) return;
  release(masks.plain);
  if (masks.fiber) release(masks.fiber);
  maskCache.delete(src);
}

const release = (c: Canvas2D) => {
  // a canvas holds its pixels (and graphics memory) until it is collected: give them back now
  c.width = 0;
  c.height = 0;
};

/** Edge width as a fraction of the cut-out's long side. */
export const EDGE_RATIO = 0.045;
/** `PatternSpec.scale` is in px at this long side; patterns scale with `L / PATTERN_REF`. */
export const PATTERN_REF = 300;

/**
 * Edge width in px for a cut-out whose longest side is `longSide` px at the resolution being
 * rendered, times the user's scale (0 = none, up to 1.6). A pure proportion, no px clamp, so the
 * on-screen preview and the larger exported file always have the same look.
 */
export function edgeWidth(longSide: number, scale = 1): number {
  if (scale <= 0) return 0;
  return Math.round(longSide * EDGE_RATIO * scale);
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
    const n3 = vnoise(R, 64, true);
    const rough = vnoise(R, 7, true);
    const fb = vnoise(R, 41, true);
    const nb = 1 + Math.floor(R() * 3);
    const bites: { a: number; w: number; lead: number }[] = [];
    for (let i = 0; i < nb; i++)
      bites.push({ a: R(), w: 0.012 + R() * 0.03, lead: 0.2 + R() * 0.6 });
    // fine grain is smooth noise, never per-sample randomness: neighbouring stamps that jump
    // in radius smear the silhouette into thin radial spikes
    const grit = vnoise(R, 110, true);
    return (a) => {
      const rr = 0.35 + 0.9 * rough(a); // ragged in places, calmer in others
      let r =
        bw *
        (0.45 + 0.6 * n1(a) + 0.4 * n2(a) + rr * (0.5 * n3(a) + 0.35 * grit(a)) - 0.2);
      for (const b of bites) {
        const x = (a - b.a) / b.w;
        if (x > -b.lead && x < 1 - b.lead) {
          const t = x < 0 ? 1 + x / b.lead : 1 - x / (1 - b.lead);
          r -= bw * 0.8 * (t * t * (3 - 2 * t)); // eased, so a bite has no sharp cusp
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
  const bw = opts.border ?? edgeWidth(Math.max(W, H));
  const shape = opts.shape ?? "wobbly";
  const pad = dieCutPad(bw);
  const out = create(W + pad * 2, H + pad * 2);
  const ctx = ctxOf(out);

  if (bw > 0) {
    // the silhouette of the cut-out, as a solid shape (made when a shape is grown, not for a
    // kept one)
    let silhouette: Canvas2D | null = null;
    const sil = () => {
      if (silhouette) return silhouette;
      silhouette = create(W, H);
      const s = ctxOf(silhouette);
      s.drawImage(src, 0, 0, W, H);
      s.globalCompositeOperation = "source-in";
      s.fillStyle = "#000";
      s.fillRect(0, 0, W, H);
      return silhouette;
    };

    const rad = edgeRadius(shape, opts.seed ?? "", bw);
    // enough stamps that neighbours are about a pixel apart (they cost fill rate: each one draws
    // the whole cut-out), at most 720 for the finest torn edge of a large export
    const N =
      shape === "torn"
        ? Math.min(720, Math.max(200, Math.round(bw * 9)))
        : Math.max(36, Math.round(bw * 4));
    // stamp the silhouette around the edge radius, three rings deep, to grow it into a mask
    const stamp = (withFiber: boolean) => {
      const c = create(out.width, out.height);
      const g = ctxOf(c);
      const shape0 = sil();
      for (let ring = 1; ring <= 3; ring++) {
        for (let i = 0; i < N; i++) {
          const a = i / N;
          const e = rad(a);
          const r = ((e.r + (withFiber ? e.f : 0)) * ring) / 3;
          g.drawImage(
            shape0,
            pad + Math.cos(a * 6.283) * r,
            pad + Math.sin(a * 6.283) * r,
          );
        }
      }
      g.drawImage(shape0, pad, pad);
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
    if (opts.cacheMasks) {
      const key = `${shape}|${bw}|${opts.seed ?? ""}|${W}x${H}|${N}`;
      let masks = maskCache.get(src);
      if (!masks || masks.key !== key) {
        if (masks) {
          release(masks.plain);
          if (masks.fiber) release(masks.fiber);
        }
        masks = {
          key,
          plain: stamp(false),
          ...(shape === "torn" ? { fiber: stamp(true) } : {}),
        };
        maskCache.set(src, masks);
      }
      // the colour or print goes onto a copy of the kept shape
      const layer = (mask: Canvas2D, color: string, img?: CanvasImageSource | null) => {
        const c = create(out.width, out.height);
        ctxOf(c).drawImage(mask, 0, 0);
        return paint(c, color, img);
      };
      if (masks.fiber) {
        const l = layer(masks.fiber, opts.fiber ?? "#fbf6ee");
        ctx.drawImage(l, 0, 0);
        release(l);
      }
      const l = layer(masks.plain, opts.color ?? "#fbf6ee", opts.fill);
      ctx.drawImage(l, 0, 0);
      release(l);
    } else {
      const layers: Canvas2D[] = [];
      if (shape === "torn") {
        const l = paint(stamp(true), opts.fiber ?? "#fbf6ee");
        ctx.drawImage(l, 0, 0);
        layers.push(l);
      }
      const l = paint(stamp(false), opts.color ?? "#fbf6ee", opts.fill);
      ctx.drawImage(l, 0, 0);
      layers.push(l);
      layers.forEach(release);
    }
    if (silhouette) release(silhouette);
  }
  ctx.drawImage(src, pad, pad, W, H);
  return out;
}
