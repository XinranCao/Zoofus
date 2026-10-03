import type { MultiPolygon } from "polygon-clipping";
import { describe, expect, it } from "vitest";
import { createFreehand } from "./geometry";
import { computeMaskPolygons, isMaskEmpty } from "./mask";
import type { Selection } from "./types";

/** Shoelace area; holes (rings after the first) are subtracted. */
function area(mask: MultiPolygon): number {
  const ringArea = (ring: [number, number][]) => {
    let sum = 0;
    for (let i = 0; i < ring.length; i++) {
      const [x1, y1] = ring[i]!;
      const [x2, y2] = ring[(i + 1) % ring.length]!;
      sum += x1 * y2 - x2 * y1;
    }
    return Math.abs(sum) / 2;
  };
  return mask.reduce(
    (total, poly) =>
      total + poly.reduce((s, ring, i) => s + (i === 0 ? 1 : -1) * ringArea(ring), 0),
    0,
  );
}

const square = (
  x: number,
  y: number,
  size: number,
  mode: "select" | "deselect",
  id: string,
): Selection => ({
  id,
  mode,
  kind: "rectangle",
  x,
  y,
  width: size,
  height: size,
  rotation: 0,
});

const image = { width: 200, height: 200 };

describe("computeMaskPolygons", () => {
  it("is empty without selections", () => {
    expect(isMaskEmpty(computeMaskPolygons([], image, image))).toBe(true);
  });

  it("returns the area of a single select shape", () => {
    const mask = computeMaskPolygons([square(10, 10, 100, "select", "a")], image, image);
    expect(area(mask)).toBeCloseTo(10_000);
  });

  it("subtracts deselect shapes", () => {
    const mask = computeMaskPolygons(
      [square(10, 10, 100, "select", "a"), square(30, 30, 50, "deselect", "b")],
      image,
      image,
    );
    expect(area(mask)).toBeCloseTo(10_000 - 2_500);
  });

  it("unions overlapping select shapes", () => {
    const mask = computeMaskPolygons(
      [square(0, 0, 100, "select", "a"), square(50, 0, 100, "select", "b")],
      image,
      image,
    );
    expect(area(mask)).toBeCloseTo(15_000);
  });

  it("clips to the image bounds", () => {
    const mask = computeMaskPolygons(
      [square(150, 150, 100, "select", "a")],
      image,
      image,
    );
    expect(area(mask)).toBeCloseTo(2_500);
  });

  it("scales from display to image coordinates", () => {
    const display = { width: 100, height: 100 };
    const mask = computeMaskPolygons([square(0, 0, 50, "select", "a")], display, image);
    expect(area(mask)).toBeCloseTo(100 * 100);
  });

  it("auto-closes an isolated freehand stroke", () => {
    const stroke = createFreehand([0, 0, 100, 0, 100, 100, 0, 100], "select", "f");
    expect(area(computeMaskPolygons([stroke], image, image))).toBeCloseTo(10_000);
  });

  it("ignores strokes that are too short to enclose anything", () => {
    const tiny = createFreehand([0, 0, 5, 5], "select", "f");
    expect(isMaskEmpty(computeMaskPolygons([tiny], image, image))).toBe(true);
  });

  it("is empty when everything is deselected", () => {
    const mask = computeMaskPolygons(
      [square(10, 10, 50, "select", "a"), square(0, 0, 100, "deselect", "b")],
      image,
      image,
    );
    expect(isMaskEmpty(mask)).toBe(true);
  });
});
