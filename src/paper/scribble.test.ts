import { describe, expect, it } from "vitest";
import { scribblePath } from "./scribble";

describe("scribblePath", () => {
  it("is deterministic per seed", () => {
    expect(scribblePath("nav")).toBe(scribblePath("nav"));
    expect(scribblePath("nav")).not.toBe(scribblePath("other"));
  });

  it("starts at x = 0 and ends at the right edge", () => {
    const d = scribblePath("end", { w: 200 });
    expect(d.startsWith("M0 ")).toBe(true);
    const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    expect(nums.at(-2)).toBe(200);
  });

  it("stays inside the box height with a little jitter", () => {
    const d = scribblePath("box", { w: 200, h: 8 });
    const ys = (d.match(/-?\d+(\.\d+)?/g) ?? [])
      .map(Number)
      .filter((_, i) => i % 2 === 1);
    for (const y of ys) {
      expect(y).toBeGreaterThan(-4);
      expect(y).toBeLessThan(12);
    }
  });

  it("alternates for the wave variant", () => {
    expect(scribblePath("w", { wave: true })).not.toBe(scribblePath("w"));
  });
});
