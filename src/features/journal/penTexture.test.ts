import { describe, expect, it } from "vitest";
import { isTextured, layoutOf, PEN_WIDTH, ratioFor } from "./penTexture";

describe("pen textures", () => {
  it("leaves the pen as a vector line and textures the rest", () => {
    expect(isTextured("pen")).toBe(false);
    expect(["pencil", "marker", "crayon"].every((t) => isTextured(t as "pencil"))).toBe(
      true,
    );
  });

  it("boxes a stroke with room for its width", () => {
    const l = layoutOf([100, 100, 200, 150], PEN_WIDTH.marker * 10)!;
    expect(l.x).toBeLessThan(100 - 13);
    expect(l.y).toBeLessThan(100 - 13);
    expect(l.x + l.w).toBeGreaterThan(200 + 13);
    expect(l.y + l.h).toBeGreaterThan(150 + 13);
  });

  it("has no box for no points", () => {
    expect(layoutOf([], 4)).toBeNull();
  });

  it("draws small strokes sharper and big ones lighter", () => {
    expect(ratioFor({ x: 0, y: 0, w: 100, h: 100 }, false)).toBe(2);
    expect(ratioFor({ x: 0, y: 0, w: 800, h: 800 }, false)).toBe(1.5);
    expect(ratioFor({ x: 0, y: 0, w: 2000, h: 2000 }, false)).toBe(1);
    expect(ratioFor({ x: 0, y: 0, w: 100, h: 100 }, true)).toBe(1);
  });
});
