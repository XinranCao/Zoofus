import { describe, expect, it } from "vitest";
import {
  createFreehand,
  createShape,
  createShapeFromDrag,
  joinOpenPathsToClosedRings,
  selectionToPoints,
  translateSelection,
} from "./geometry";

describe("selectionToPoints", () => {
  it("returns freehand points unchanged", () => {
    const sel = createFreehand([1, 2, 3, 4], "select", "a");
    expect(selectionToPoints(sel)).toEqual([1, 2, 3, 4]);
  });

  it("returns the four corners of an unrotated rectangle", () => {
    const rect = {
      ...createShape("rectangle", "select", "r"),
      x: 10,
      y: 20,
      width: 100,
      height: 50,
    };
    expect(selectionToPoints(rect)).toEqual([10, 20, 110, 20, 110, 70, 10, 70]);
  });

  it("rotates a rectangle about its top-left corner", () => {
    const rect = {
      ...createShape("rectangle", "select", "r"),
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      rotation: 90,
    };
    const [, , x2, y2] = selectionToPoints(rect);
    expect(x2).toBeCloseTo(0);
    expect(y2).toBeCloseTo(10);
  });

  it("builds a triangle with 3 vertices and a star with 2 per point", () => {
    expect(selectionToPoints(createShape("triangle", "select", "t"))).toHaveLength(6);
    expect(selectionToPoints(createShape("star", "select", "s"))).toHaveLength(20);
  });

  it("puts the first triangle vertex straight above the center", () => {
    const tri = { ...createShape("triangle", "select", "t"), x: 50, y: 50, radius: 10 };
    const [x, y] = selectionToPoints(tri);
    expect(x).toBeCloseTo(50);
    expect(y).toBeCloseTo(40);
  });
});

describe("joinOpenPathsToClosedRings", () => {
  it("keeps a single path that ends near its start as a ring", () => {
    const path = [0, 0, 100, 0, 100, 100, 0, 100, 2, 2];
    const { rings, used } = joinOpenPathsToClosedRings([path], 10);
    expect(rings).toEqual([path]);
    expect(used).toEqual([true]);
  });

  it("does not close a path whose ends are far apart", () => {
    const { rings, used } = joinOpenPathsToClosedRings(
      [[0, 0, 100, 0, 100, 100, 50, 150]],
      10,
    );
    expect(rings).toEqual([]);
    expect(used).toEqual([false]);
  });

  it("joins two open paths into one closed ring", () => {
    const a = [0, 0, 100, 0, 100, 100];
    const b = [100, 100, 0, 100, 0, 0];
    const { rings, used } = joinOpenPathsToClosedRings([a, b], 10);
    expect(rings).toHaveLength(1);
    expect(used).toEqual([true, true]);
  });
});

describe("translateSelection", () => {
  it("shifts every point of a freehand stroke", () => {
    const moved = translateSelection(createFreehand([0, 0, 10, 5], "select", "a"), 3, -2);
    expect(moved).toMatchObject({ points: [3, -2, 13, 3] });
  });

  it("shifts a shape's origin and keeps its other properties", () => {
    const rect = { ...createShape("rectangle", "select", "r"), x: 10, y: 20, width: 5 };
    expect(translateSelection(rect, 1, 2)).toMatchObject({
      x: 11,
      y: 22,
      width: 5,
      kind: "rectangle",
    });
  });
});

describe("createShapeFromDrag", () => {
  it("makes a rectangle of the dragged box, from any corner", () => {
    const a = createShapeFromDrag("rectangle", "select", "r", 10, 20, 110, 80);
    const b = createShapeFromDrag("rectangle", "select", "r", 110, 80, 10, 20);
    expect(a).toMatchObject({ kind: "rectangle", x: 10, y: 20, width: 100, height: 60 });
    expect(b).toEqual(a);
  });

  it("ignores a click or a tiny drag", () => {
    expect(createShapeFromDrag("rectangle", "select", "r", 10, 10, 10, 10)).toBeNull();
    expect(createShapeFromDrag("star", "select", "s", 10, 10, 15, 200)).toBeNull();
  });

  it.each(["triangle", "star"] as const)("fits a %s inside the dragged box", (kind) => {
    const sel = createShapeFromDrag(kind, "deselect", "x", 100, 100, 300, 260)!;
    expect(sel.mode).toBe("deselect");
    const pts = selectionToPoints(sel);
    const xs = pts.filter((_, i) => i % 2 === 0);
    const ys = pts.filter((_, i) => i % 2 === 1);
    // inside the box (a hair of tolerance), and filling it along its limiting side
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(99.5);
    expect(Math.max(...xs)).toBeLessThanOrEqual(300.5);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(99.5);
    expect(Math.max(...ys)).toBeLessThanOrEqual(260.5);
    const fillsW = Math.max(...xs) - Math.min(...xs) > 195;
    const fillsH = Math.max(...ys) - Math.min(...ys) > 155;
    expect(fillsW || fillsH).toBe(true);
  });
});
