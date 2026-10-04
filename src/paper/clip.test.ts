import { describe, expect, it } from "vitest";
import { clipPolygon } from "./clip";
import { tapeEnds } from "./tapeShape";
import { tornClip } from "./torn";

describe("clipPolygon", () => {
  it("reads px, % and calc(100% - px)", () => {
    expect(
      clipPolygon(
        "polygon(0px 0px, 50% 10px, calc(100% - 4px) calc(100% - 2px))",
        200,
        100,
      ),
    ).toEqual([
      [0, 0],
      [100, 10],
      [196, 98],
    ]);
  });
  it("returns null for none or garbage", () => {
    expect(clipPolygon("none", 10, 10)).toBeNull();
    expect(clipPolygon("polygon(a b)", 10, 10)).toBeNull();
  });
  it("reads the real shapes the app makes", () => {
    const torn = clipPolygon(tornClip("x", { size: "sm", w: 150, h: 46 }), 150, 46);
    expect(torn!.length).toBeGreaterThan(20);
    for (const [x, y] of torn!) {
      expect(x).toBeGreaterThanOrEqual(-1);
      expect(x).toBeLessThanOrEqual(151);
      expect(y).toBeGreaterThanOrEqual(-1);
      expect(y).toBeLessThanOrEqual(47);
    }
    expect(
      clipPolygon(tapeEnds("t", "pinked", 100, 20), 100, 20)!.length,
    ).toBeGreaterThan(6);
    expect(clipPolygon(tapeEnds("t", "cut", 100, 20), 100, 20)).toBeNull();
    expect(clipPolygon(tapeEnds("t", "torn", 100, 20), 100, 20)!.length).toBeGreaterThan(
      6,
    );
  });
});
