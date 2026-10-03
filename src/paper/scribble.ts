import { f1, rng } from "./random";

/** Path data for a seeded hand-drawn line (viewBox 0 0 200 8 by default). */
export function scribblePath(
  seed: string,
  opts: { w?: number; h?: number; wave?: boolean } = {},
): string {
  const W = opts.w ?? 200;
  const H = opts.h ?? 8;
  const R = rng("s" + seed);
  const n = Math.round(W / 16);
  let y = H / 2;
  let d = "M0 " + f1(y + (R() - 0.5) * 2);
  for (let i = 1; i <= n; i++) {
    const x = (i / n) * W;
    const ny =
      H / 2 +
      (R() - 0.5) * H * (opts.wave ? 0 : 0.55) +
      (opts.wave ? (i % 2 ? -2 : 2) : 0);
    d +=
      " Q" +
      f1(x - W / n / 2) +
      " " +
      f1((y + ny) / 2 + (R() - 0.5) * 1.5) +
      " " +
      f1(x) +
      " " +
      f1(ny);
    y = ny;
  }
  return d;
}
