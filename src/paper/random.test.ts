import { describe, expect, it } from "vitest";
import { f1, hash, rng, seededAngle, seededRot, vnoise } from "./random";

describe("rng", () => {
  it("gives the same sequence for the same seed", () => {
    const a = rng("zoofus");
    const b = rng("zoofus");
    const seqA = Array.from({ length: 20 }, a);
    const seqB = Array.from({ length: 20 }, b);
    expect(seqA).toEqual(seqB);
  });

  it("gives different sequences for different seeds", () => {
    expect(Array.from({ length: 5 }, rng("a"))).not.toEqual(
      Array.from({ length: 5 }, rng("b")),
    );
  });

  it("stays in [0, 1)", () => {
    const R = rng("range");
    for (let i = 0; i < 5000; i++) {
      const v = R();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("accepts a numeric seed", () => {
    expect(rng(42)()).toBe(rng(42)());
  });
});

describe("hash", () => {
  it("is stable and unsigned 32-bit", () => {
    expect(hash("abc")).toBe(hash("abc"));
    expect(hash("abc")).not.toBe(hash("abd"));
    expect(hash("anything")).toBeGreaterThanOrEqual(0);
    expect(hash("anything")).toBeLessThan(2 ** 32);
  });
});

describe("vnoise", () => {
  it("stays within [0, 1] and clamps its input", () => {
    const n = vnoise(rng("n"), 6);
    for (let t = -0.5; t <= 1.5; t += 0.05) {
      expect(n(t)).toBeGreaterThanOrEqual(0);
      expect(n(t)).toBeLessThanOrEqual(1);
    }
  });

  it("joins up when periodic", () => {
    const n = vnoise(rng("p"), 8, true);
    expect(n(0)).toBeCloseTo(n(1), 10);
  });
});

describe("seededRot / seededAngle", () => {
  it("is deterministic and within the range", () => {
    expect(seededRot("card-1", 1.5)).toBe(seededRot("card-1", 1.5));
    for (const id of ["a", "b", "c", "d", "e", "f", "g"]) {
      expect(Math.abs(seededAngle(id, 0.8))).toBeLessThanOrEqual(0.8);
    }
  });

  it("formats as a CSS degree value", () => {
    expect(seededRot("x", 4)).toMatch(/^-?\d+\.\d{2}deg$/);
  });
});

describe("f1", () => {
  it("rounds to one decimal", () => {
    expect(f1(3.14159)).toBe(3.1);
    expect(f1(2)).toBe(2);
  });
});
