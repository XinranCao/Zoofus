import { describe, expect, it } from "vitest";
import type { MultiPolygon } from "polygon-clipping";
import {
  cutRect,
  decodeOutline,
  encodeOutline,
  MAX_OUTLINE_CHARS,
  simplifyRing,
  type Ring,
} from "./outline";

const square = (x: number, y: number, s: number): Ring => [
  [x, y],
  [x + s, y],
  [x + s, y + s],
  [x, y + s],
  [x, y],
];

describe("simplifyRing", () => {
  it("drops points on a straight line and keeps the corners", () => {
    const ring: Ring = [];
    for (let i = 0; i <= 50; i++) ring.push([i, 0]);
    for (let i = 1; i <= 50; i++) ring.push([50, i]);
    for (let i = 49; i >= 0; i--) ring.push([i, 50]);
    const out = simplifyRing(ring, 0.5);
    expect(out.length).toBeLessThan(10);
    expect(out).toContainEqual([50, 0]);
    expect(out).toContainEqual([50, 50]);
  });

  it("keeps a wobble bigger than the tolerance", () => {
    const ring: Ring = [
      [0, 0],
      [5, 0.2],
      [10, 5],
      [15, 0.2],
      [20, 0],
      [20, 20],
      [0, 20],
    ];
    expect(simplifyRing(ring, 1)).toContainEqual([10, 5]);
  });
});

describe("outline text", () => {
  it("round-trips a mask into the cut-out's pixels", () => {
    // a 100 x 50 mask drawn at (30, 40) in the photo, cut out at half size
    const mask: MultiPolygon = [
      [
        [
          [30, 40],
          [130, 40],
          [130, 90],
          [30, 90],
          [30, 40],
        ],
      ],
    ];
    const text = encodeOutline(mask, 50, 25)!;
    expect(text.startsWith("50x25|")).toBe(true);
    const o = decodeOutline(text)!;
    expect(o.width).toBe(50);
    expect(o.height).toBe(25);
    const xs = o.rings[0]!.map((p) => p[0]);
    const ys = o.rings[0]!.map((p) => p[1]);
    expect(Math.min(...xs)).toBeCloseTo(0, 1);
    expect(Math.max(...xs)).toBeCloseTo(50, 1);
    expect(Math.min(...ys)).toBeCloseTo(0, 1);
    expect(Math.max(...ys)).toBeCloseTo(25, 1);
  });

  it("keeps holes as their own rings", () => {
    const mask: MultiPolygon = [[square(0, 0, 100), square(30, 30, 20)]];
    const o = decodeOutline(encodeOutline(mask, 100, 100)!)!;
    expect(o.rings).toHaveLength(2);
  });

  it("stays small for a dense freehand lasso", () => {
    const ring: Ring = [];
    for (let i = 0; i < 20000; i++) {
      const a = (i / 20000) * Math.PI * 2;
      const r = 400 + 6 * Math.sin(a * 37) + 3 * Math.sin(a * 91);
      ring.push([500 + Math.cos(a) * r, 500 + Math.sin(a) * r]);
    }
    ring.push(ring[0]!);
    const text = encodeOutline([[ring]], 800, 800)!;
    expect(text.length).toBeLessThanOrEqual(MAX_OUTLINE_CHARS);
    expect(decodeOutline(text)!.rings[0]!.length).toBeGreaterThan(20);
  });

  it("returns null for nothing and for text that is not an outline", () => {
    expect(encodeOutline([], 10, 10)).toBeNull();
    expect(decodeOutline(undefined)).toBeNull();
    expect(decodeOutline("nonsense")).toBeNull();
    expect(decodeOutline("10x10|1,1 2,2")).toBeNull();
  });
});

describe("cutRect", () => {
  it("is the margin on every side when nothing was shrunk", () => {
    expect(cutRect(120, 90, 100, 70, 120, 90)).toEqual({ x: 10, y: 10, w: 100, h: 70 });
  });
  it("follows the picture when it was shrunk to be stored", () => {
    // 2000 x 1000 finished, stored at 1000 x 500
    expect(cutRect(2000, 1000, 1900, 900, 1000, 500)).toEqual({
      x: 25,
      y: 25,
      w: 950,
      h: 450,
    });
  });
});
