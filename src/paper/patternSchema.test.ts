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

  it("rejects an unknown shape, a scale outside 0-1.6 and an unknown colour", () => {
    expect(edgeSpecSchema.safeParse({ ...edge, shape: "zigzag" }).success).toBe(false);
    expect(edgeSpecSchema.safeParse({ ...edge, scale: 2 }).success).toBe(false);
    expect(edgeSpecSchema.safeParse({ ...edge, scale: -0.1 }).success).toBe(false);
    expect(
      edgeSpecSchema.safeParse({ ...edge, fill: { ...edge.fill, bg: "hotpink" } })
        .success,
    ).toBe(false);
  });
});

describe("patternSpecSchema", () => {
  it("requires exactly 8 pixel rows of 8 cells", () => {
    expect(
      patternSpecSchema.safeParse({
        kind: "pixels",
        bg: "cream-100",
        pixels: HEART_PIXELS,
      }).success,
    ).toBe(true);
    expect(
      patternSpecSchema.safeParse({
        kind: "pixels",
        bg: "cream-100",
        pixels: HEART_PIXELS.slice(1),
      }).success,
    ).toBe(false);
    expect(
      patternSpecSchema.safeParse({
        kind: "pixels",
        bg: "cream-100",
        pixels: ["0000000x", ...HEART_PIXELS.slice(1)],
      }).success,
    ).toBe(false);
  });

  it("caps the number and length of doodle strokes", () => {
    const many = Array.from({ length: 61 }, () => "M1 1 L2 2");
    expect(
      patternSpecSchema.safeParse({ kind: "doodle", bg: "cream-100", strokes: many })
        .success,
    ).toBe(false);
    expect(
      patternSpecSchema.safeParse({
        kind: "doodle",
        bg: "cream-100",
        strokes: ["M" + "1".repeat(2001)],
      }).success,
    ).toBe(false);
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
