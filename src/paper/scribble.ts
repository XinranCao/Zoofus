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
 * Path data for a hand-drawn loop round something, as if circled with a pencil in one go: a smooth
 * oval, a little tilted, that wanders gently, starts and ends in different places and overshoots
 * so the line crosses itself (viewBox 0 0 100 40). The line is a Catmull-Rom curve through many
 * points, so it flows without corners.
 */
export function circlePath(seed: string): string {
  const R = rng("c" + seed);
  const cx = 50;
  const cy = 20;
  const rx = 45;
  const ry = 15.5;
  const tilt = (-2.5 + (R() - 0.5) * 3) * (Math.PI / 180);
  const steps = 28;
  const start = -Math.PI * 0.55 + (R() - 0.5) * 0.35;
  const sweep = Math.PI * 2 + 0.6 + R() * 0.3; // past the start: the pen overlaps itself
  // slow waves in the radius (two or three of them), never jitter
  const w1 = R() * 6.28;
  const w2 = R() * 6.28;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const a = start + sweep * u;
    const k =
      1 + u * 0.06 - 0.02 + 0.025 * Math.sin(a * 2 + w1) + 0.015 * Math.sin(a * 3 + w2);
    const x = Math.cos(a) * rx * k;
    const y = Math.sin(a) * ry * k;
    pts.push([
      cx + x * Math.cos(tilt) - y * Math.sin(tilt),
      cy + x * Math.sin(tilt) + y * Math.cos(tilt),
    ]);
  }
  let d = "M" + f1(pts[0]![0]) + " " + f1(pts[0]![1]);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    d +=
      " C" +
      f1(p1[0] + (p2[0] - p0[0]) / 6) +
      " " +
      f1(p1[1] + (p2[1] - p0[1]) / 6) +
      " " +
      f1(p2[0] - (p3[0] - p1[0]) / 6) +
      " " +
      f1(p2[1] - (p3[1] - p1[1]) / 6) +
      " " +
      f1(p2[0]) +
      " " +
      f1(p2[1]);
  }
  return d;
}
