import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import {
  STARTER_TAPES,
  angleFromPointer,
  clampAngle,
  tapeDocSchema,
} from "./tape.schema";

const doc = {
  name: "Pink dots",
  pattern: { kind: "dots", bg: "pink-200", ink: "sheet-50", scale: 9, weight: 0.35 },
  thickness: 20,
  opacity: 0.82,
  ends: "torn",
  createdAt: Timestamp.fromDate(new Date("2026-10-03T00:00:00Z")),
};

describe("tapeDocSchema", () => {
  it("parses a stored tape and converts the timestamp", () => {
    expect(tapeDocSchema.parse(doc).createdAt).toEqual(new Date("2026-10-03T00:00:00Z"));
  });

  it("rejects values the rules would refuse", () => {
    expect(tapeDocSchema.safeParse({ ...doc, thickness: 5 }).success).toBe(false);
    expect(tapeDocSchema.safeParse({ ...doc, opacity: 0.3 }).success).toBe(false);
    expect(tapeDocSchema.safeParse({ ...doc, ends: "zigzag" }).success).toBe(false);
    expect(tapeDocSchema.safeParse({ ...doc, name: "" }).success).toBe(false);
  });

  it("ships valid starter tapes", () => {
    for (const t of STARTER_TAPES) {
      expect(tapeDocSchema.omit({ createdAt: true }).safeParse(t).success).toBe(true);
    }
  });
});

describe("angles", () => {
  it("clamps to −90…90 and rounds", () => {
    expect(clampAngle(120)).toBe(90);
    expect(clampAngle(-120)).toBe(-90);
    expect(clampAngle(12.6)).toBe(13);
  });

  it("reads the angle from the pointer, folding the far side back", () => {
    expect(angleFromPointer(10, 0)).toBe(0);
    expect(angleFromPointer(10, 10)).toBe(45);
    expect(angleFromPointer(10, -10)).toBe(-45);
    expect(angleFromPointer(-10, 10)).toBe(-45); // opposite side of the same line
    expect(angleFromPointer(0, 10)).toBe(90);
  });
});
