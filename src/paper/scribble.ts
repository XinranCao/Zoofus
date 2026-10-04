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

/**
 * Path data for a hand-drawn loop round something, as if circled with a pen: an ellipse that wanders a
 * little and overshoots where it started (viewBox 0 0 100 40).
 */
export function circlePath(seed: string): string {
  const R = rng("c" + seed);
  const cx = 50;
  const cy = 20;
  const rx = 46;
  const ry = 16.5;
  const steps = 12;
  const start = -Math.PI * 0.62 + (R() - 0.5) * 0.4;
  const sweep = Math.PI * 2 + 0.55 + R() * 0.25; // past the start: the pen overlaps itself
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = start + (sweep * i) / steps;
    const drift = 1 + (i / steps) * 0.07 - 0.03 + (R() - 0.5) * 0.06; // the loop spirals slightly
    pts.push([cx + Math.cos(a) * rx * drift, cy + Math.sin(a) * ry * drift]);
  }
  let d = "M" + f1(pts[0]![0]) + " " + f1(pts[0]![1]);
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1]!;
    const [x, y] = pts[i]!;
    d +=
      " Q" +
      f1(px + (x - px) * 0.5 + (R() - 0.5)) +
      " " +
      f1(py + (y - py) * 0.5 + (R() - 0.5)) +
      " " +
      f1(x) +
      " " +
      f1(y);
  }
  return d;
}
