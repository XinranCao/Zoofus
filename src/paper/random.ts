/** Seeded randomness: the same seed always gives the same scrap, tear, tilt and doodle. */

/** FNV-1a string hash → unsigned 32-bit integer. */
export function hash(input: string | number): number {
  const str = String(input);
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type Rng = () => number;

/** mulberry32: a small, fast seeded generator. Returns values in [0, 1). */
export function rng(seed: string | number): Rng {
  let a = typeof seed === "number" ? seed : hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 1-D value noise on [0,1] with smoothstep interpolation; periodic for closed outlines. */
export function vnoise(R: Rng, cells: number, periodic = false): (t: number) => number {
  const n = Math.max(1, Math.round(cells));
  const v: number[] = [];
  for (let i = 0; i <= n; i++) v.push(R());
  if (periodic) v[n] = v[0]!;
  return (t) => {
    const x = Math.min(Math.max(t, 0), 1) * n;
    const i = Math.min(n - 1, Math.floor(x));
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    return v[i]! * (1 - u) + v[i + 1]! * u;
  };
}

/** A seeded angle in ±range degrees (a number, for maths). */
export function seededAngle(seed: string, range: number): number {
  const R = rng("rot" + seed);
  return (R() * 2 - 1) * range;
}

/** A seeded rotation as a CSS value, e.g. "-0.37deg". */
export function seededRot(seed: string, range: number): string {
  return seededAngle(seed, range).toFixed(2) + "deg";
}

/** Round to one decimal (keeps clip-path strings short). */
export function f1(n: number): number {
  return Math.round(n * 10) / 10;
}
