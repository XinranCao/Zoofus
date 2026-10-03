import { describe, expect, it } from "vitest";
import {
  createFreehand,
  createShape,
  joinOpenPathsToClosedRings,
  selectionToPoints,
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
