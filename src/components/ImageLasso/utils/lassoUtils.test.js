import { describe, it, expect } from "vitest";
import { joinOpenPathsToClosedRings } from "./lassoUtils";

describe("joinOpenPathsToClosedRings", () => {
  it("keeps a single path that ends near its start as a ring", () => {
    const path = [0, 0, 100, 0, 100, 100, 0, 100, 2, 2];
    const { rings, used } = joinOpenPathsToClosedRings([path]);
    expect(rings).toEqual([path]);
    expect(used).toEqual([true]);
  });

  it("does not close a path whose ends are far apart", () => {
    const path = [0, 0, 100, 0, 100, 100, 50, 150];
    const { rings, used } = joinOpenPathsToClosedRings([path]);
    expect(rings).toEqual([]);
    expect(used).toEqual([false]);
  });

  it("joins two open paths into one closed ring", () => {
    const a = [0, 0, 100, 0, 100, 100];
    const b = [100, 100, 0, 100, 0, 0];
    const { rings, used } = joinOpenPathsToClosedRings([a, b]);
    expect(rings).toHaveLength(1);
    expect(used).toEqual([true, true]);
  });
});
