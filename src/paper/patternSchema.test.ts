import { describe, expect, it } from "vitest";
import { HEART_PIXELS } from "./pattern";
import {
  cleanForFirestore,
  edgeSpecSchema,
  parseEdge,
  patternSpecSchema,
} from "./patternSchema";

const edge = {
  shape: "torn",
  scale: 1.2,
  fill: { kind: "dots", bg: "pink-200", ink: "sheet-50", scale: 9, weight: 0.35 },
};

describe("edgeSpecSchema", () => {
  it("accepts a valid edge", () => {
    expect(edgeSpecSchema.safeParse(edge).success).toBe(true);
  });

  it("rejects an unknown shape and a scale outside 0-1.6", () => {
    expect(edgeSpecSchema.safeParse({ ...edge, shape: "zigzag" }).success).toBe(false);
    expect(edgeSpecSchema.safeParse({ ...edge, scale: 2 }).success).toBe(false);
    expect(edgeSpecSchema.safeParse({ ...edge, scale: -0.1 }).success).toBe(false);
  });

  it("reads an unknown colour as paper white instead of failing", () => {
    const r = edgeSpecSchema.parse({ ...edge, fill: { ...edge.fill, bg: "hotpink" } });
    expect(r.fill.bg).toBe("sheet-50");
  });
});

describe("patternSpecSchema (lenient reads)", () => {
  it("keeps exactly 8 pixel rows of 8 cells and drops anything else", () => {
    const ok = patternSpecSchema.parse({
      kind: "pixels",
      bg: "cream-100",
      pixels: HEART_PIXELS,
    });
    expect(ok.pixels).toEqual(HEART_PIXELS);
    const short = patternSpecSchema.parse({
      kind: "pixels",
      bg: "cream-100",
      pixels: HEART_PIXELS.slice(1),
    });
    expect(short.pixels).toBeUndefined();
    const bad = patternSpecSchema.parse({
      kind: "pixels",
      bg: "cream-100",
      pixels: ["0000000x", ...HEART_PIXELS.slice(1)],
    });
    expect(bad.pixels).toBeUndefined();
  });

  it("caps doodle strokes at 60 and drops strokes that are not plain path data", () => {
    const many = Array.from({ length: 70 }, () => "M1 1 L2 2");
    expect(
      patternSpecSchema.parse({ kind: "doodle", bg: "cream-100", strokes: many }).strokes,
    ).toHaveLength(60);
    const mixed = patternSpecSchema.parse({
      kind: "doodle",
      bg: "cream-100",
      strokes: ["M1 1 L2 2", "M" + "1".repeat(2001), '"/><script>', 42],
    });
    expect(mixed.strokes).toEqual(["M1 1 L2 2"]);
  });

  it("still reads a sticker edge saved by round 1, whose doodle had an arc command", () => {
    const old = {
      shape: "wobbly",
      scale: 1,
      fill: {
        kind: "dots",
        bg: "pink-200",
        ink: "sheet-50",
        scale: 12,
        angle: 45,
        weight: 0.4,
        pixels: HEART_PIXELS,
        strokes: [
          "M8 30 C14 18 22 18 26 28 S38 38 42 24",
          "M10 10 l4 4 M14 10 l-4 4",
          "M34 40 a3 3 0 1 0 0.1 0",
        ],
      },
    };
    const r = edgeSpecSchema.safeParse(old);
    expect(r.success).toBe(true);
    expect(r.data?.fill.strokes).toHaveLength(2); // the arc stroke is dropped, the rest is kept
  });
});

describe("helpers", () => {
  it("parseEdge returns null for garbage", () => {
    expect(parseEdge({ shape: "nope" })).toBeNull();
    expect(parseEdge(edge)).toMatchObject({ shape: "torn" });
  });

  it("cleanForFirestore drops undefined fields", () => {
    expect(cleanForFirestore({ a: 1, b: undefined, c: { d: undefined, e: 2 } })).toEqual({
      a: 1,
      c: { e: 2 },
    });
  });
});
