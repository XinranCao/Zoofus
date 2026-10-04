import { f1, hash, rng, vnoise, type Rng } from "./random";

/**
 * Torn-edge generator, "torn out of a magazine".
 * One edge is a wandering tear built from layered value noise (bow + drift, mid wander, fine
 * fibre jags, per-point grit) whose roughness changes along the edge, plus 0-2 asymmetric bites.
 * tornPair() returns two clip-path polygons: the printed `face` and a slightly larger `fiber`
 * outline behind it; where they differ you see the pale lip a real tear leaves.
 * Points mix a percentage along the edge with a pixel depth, so one string fits any size.
 */

export type TearSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface TearPreset {
  amp: number;
  res: number;
  nick: number;
  fiber: number;
  w: number;
  h: number;
}

export const TEAR: Record<TearSize, TearPreset> = {
  xs: { amp: 2.6, res: 2, nick: 0.15, fiber: 1.4, w: 90, h: 32 },
  sm: { amp: 3.6, res: 2.5, nick: 0.25, fiber: 2, w: 150, h: 46 },
  md: { amp: 5.5, res: 3, nick: 0.4, fiber: 3.2, w: 300, h: 200 },
  lg: { amp: 7.5, res: 3.5, nick: 0.5, fiber: 4, w: 560, h: 420 },
  xl: { amp: 10, res: 4, nick: 0.6, fiber: 5, w: 1280, h: 90 },
};

export interface TornOptions {
  size?: TearSize;
  /** Depth range of the wandering tear (px). */
  amp?: number;
  /** Px between points (fine detail). */
  res?: number;
  /** Chance of bites on an edge (scaled by edge length). */
  nick?: number;
  /** Max lip width (px). 0 turns the lip off. */
  fiber?: number;
  /** 'trbl' (all torn), any subset, or 'auto' (all torn, ~35% keep one straight cut edge). */
  edges?: string;
  /** Untorn edges sit exactly on the box (masthead) instead of a slightly skewed cut. */
  flush?: boolean;
  /** Approximate size in px (only the point count depends on it, bucketed to 64px). */
  w?: number;
  h?: number;
}

export interface EdgePoint {
  /** Position along the edge, 0..1. */
  t: number;
  /** Depth of the printed face (px). */
  d: number;
  /** Depth of the fibre outline (px); never deeper than `d`. */
  f: number;
  fb?: number;
}

interface ResolvedOptions {
  amp: number;
  res: number;
  nick: number;
  fiber: number;
  w: number;
  h: number;
  edges: string;
  flush: boolean;
}

export function resolveOptions(opts: TornOptions = {}): ResolvedOptions {
  const base = TEAR[opts.size ?? "md"];
  return {
    amp: opts.amp ?? base.amp,
    res: opts.res ?? base.res,
    nick: opts.nick ?? base.nick,
    fiber: opts.fiber ?? base.fiber,
    w: opts.w ?? base.w,
    h: opts.h ?? base.h,
    edges: opts.edges ?? "trbl",
    flush: Boolean(opts.flush),
  };
}

/** One torn edge as points along its length. Exported for tests. */
export function tearEdge(R: Rng, len: number, o: ResolvedOptions): EdgePoint[] {
  const n = Math.max(8, Math.min(420, Math.round(len / o.res)));
  const big = vnoise(R, 2 + Math.floor(R() * 2));
  const mid = vnoise(R, Math.max(4, len / 38));
  const fine = vnoise(R, Math.max(8, len / 7));
  const rough = vnoise(R, 3 + Math.floor(R() * 4));
  const fib = vnoise(R, Math.max(5, len / 18));
  // every edge gets its own character, so no two edges of one scrap match
  const slope = (R() * 2 - 1) * 0.9;
  const bow = 0.4 + R() * 0.9;
  const roughBase = 0.15 + R() * 0.55;
  const lip = 0.5 + R() * 0.8;
  const nb = R() < o.nick * Math.min(2, len / 160) ? (R() < 0.25 ? 2 : 1) : 0;
  const bites: { t: number; w: number; d: number; lead: number }[] = [];
  for (let k = 0; k < nb; k++) {
    bites.push({
      t: 0.08 + R() * 0.84,
      w: (5 + R() * 22) / len,
      d: o.amp * (1 + R() * 1.6),
      lead: 0.2 + R() * 0.6,
    });
  }
  // Short edges (a 28px swatch, a 34px avatar) get a calmer tear: the fine, per-point jitter that
  // reads as paper fibre on a card reads as stray spikes on something this small.
  const calm = Math.min(1, Math.max(0.3, len / 140));
  const pts: EdgePoint[] = [];
  let min = Infinity;
  for (let i = 0; i <= n; i++) {
    let t = i / n;
    if (i > 0 && i < n) t += ((R() - 0.5) * 0.7) / n;
    const r = Math.min(1, roughBase + rough(t) * 0.9);
    let d =
      o.amp *
        (bow * big(t) + 0.5 * mid(t) + calm * r * (0.55 * fine(t) + 0.45 * R() * R())) +
      slope * o.amp * t;
    for (const bt of bites) {
      // asymmetric bite: steep on one side, slow on the other
      const x = (t - bt.t) / bt.w;
      if (x > -bt.lead && x < 1 - bt.lead) {
        const u = x < 0 ? 1 + x / bt.lead : 1 - x / (1 - bt.lead);
        d += bt.d * Math.pow(u, 0.6);
      }
    }
    pts.push({ t, d, f: d, fb: fib(t) });
    if (d < min) min = d;
  }
  for (const p of pts) {
    // Big scraps have a lip that comes and goes like torn fibre. On a small piece that reads as
    // stray slivers, so there it is a steady strip with only a gentle swell.
    const wavy = Math.min(
      o.fiber,
      o.fiber * lip * Math.max(0.12, (p.fb ?? 0) * 1.7 - 0.3) * (0.75 + 0.5 * R()),
    );
    const steady = o.fiber * (0.55 + 0.45 * (p.fb ?? 0));
    const fw = len < 100 ? steady : wavy;
    p.d = p.d - min + o.fiber;
    p.f = p.d - fw; // the fibre sits outside the face, inside the box
  }
  return pts;
}

/** A scissor-cut (or page) edge: straight but not square. Exported for tests. */
export function cutEdge(R: Rng, len: number, o: ResolvedOptions): EdgePoint[] {
  void len;
  const n = 2;
  const a = o.flush ? 0 : R() * o.amp * 0.6;
  const b = o.flush ? 0 : R() * o.amp * 0.6;
  const pts: EdgePoint[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const d = a + (b - a) * t + (o.flush ? 0 : o.fiber * 0.3);
    pts.push({ t, d, f: d });
  }
  return pts;
}

const clipCache = new Map<string, TornPair>();
const stats = { generated: 0, ms: 0 };

/** How many tears were generated (cache misses) and the time they took: for performance checks. */
export function tornStats(): { generated: number; ms: number } {
  return { ...stats };
}

export interface TornPair {
  face: string;
  fiber: string;
}

/** Deterministic per seed + options; results are memoised per seed and 64px size bucket. */
export function tornPair(seed: string, opts: TornOptions = {}): TornPair {
  const o = resolveOptions(opts);
  const key = [
    seed,
    o.amp,
    o.res,
    o.nick,
    o.fiber,
    o.edges,
    o.flush,
    Math.round(o.w / 64),
    Math.round(o.h / 64),
  ].join("|");
  const hit = clipCache.get(key);
  if (hit) return hit;
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;

  const R = rng(hash(key));
  let E = o.edges;
  if (E === "auto") {
    E = "trbl";
    if (R() < 0.35) E = E.replace("trbl".charAt(Math.floor(R() * 4)), "");
  }
  const edge = (k: string, len: number) =>
    E.includes(k) ? tearEdge(R, len, o) : cutEdge(R, len, o);
  const T = edge("t", o.w);
  const Rt = edge("r", o.h);
  const B = edge("b", o.w);
  const L = edge("l", o.h);

  // The along-the-edge positions are the same for the face and the lip, so they are formatted once.
  const pos = (E: EdgePoint[], flip: boolean) =>
    E.map((p) => f1((flip ? 1 - p.t : p.t) * 100) + "%");
  const Tx = pos(T, false);
  const Ry = pos(Rt, false);
  const Bx = pos(B, true);
  const Ly = pos(L, true);

  const build = (k: "d" | "f") => {
    const P: string[] = [];
    let i: number;
    for (i = 0; i < T.length; i++) {
      // top: left → right
      const x =
        i === 0
          ? f1(L[L.length - 1]![k]) + "px"
          : i === T.length - 1
            ? "calc(100% - " + f1(Rt[0]![k]) + "px)"
            : Tx[i]!;
      P.push(x + " " + f1(T[i]![k]) + "px");
    }
    for (i = 1; i < Rt.length; i++) {
      // right: top → bottom
      const y = i === Rt.length - 1 ? "calc(100% - " + f1(B[0]![k]) + "px)" : Ry[i]!;
      P.push("calc(100% - " + f1(Rt[i]![k]) + "px) " + y);
    }
    for (i = 1; i < B.length; i++) {
      // bottom: right → left
      const bx = i === B.length - 1 ? f1(L[0]![k]) + "px" : Bx[i]!;
      P.push(bx + " calc(100% - " + f1(B[i]![k]) + "px)");
    }
    for (i = 1; i < L.length - 1; i++) {
      // left: bottom → top
      P.push(f1(L[i]![k]) + "px " + Ly[i]!);
    }
    return "polygon(" + P.join(",") + ")";
  };

  const out = { face: build("d"), fiber: build("f") };
  clipCache.set(key, out);
  stats.generated++;
  if (typeof performance !== "undefined") stats.ms += performance.now() - t0;
  return out;
}

export function tornClip(seed: string, opts?: TornOptions): string {
  return tornPair(seed, opts).face;
}

/** CSS custom properties for a torn wrapper: `--clip` (face) and `--fclip` (fibre lip). */
export function tornVars(
  seed: string,
  opts?: TornOptions,
): { "--clip": string; "--fclip": string } {
  const p = tornPair(seed, opts);
  return { "--clip": p.face, "--fclip": p.fiber };
}

/** Exposed so tests can prove the cache is shared across size buckets. */
export function tornCacheSize(): number {
  return clipCache.size;
}
