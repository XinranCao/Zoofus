import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import { MAX_PAGE_ITEMS, pageDocSchema } from "./page.schema";

const now = Timestamp.fromDate(new Date("2026-10-03T00:00:00Z"));
const base = {
  title: "Trip",
  width: 1080,
  height: 1440,
  background: "dots",
  items: [{ id: "i1", stickerId: "s1", x: 10, y: 20, scale: 1, rotation: 0, z: 0 }],
  createdAt: now,
  updatedAt: now,
};

describe("pageDocSchema", () => {
  it("parses a stored page and converts timestamps", () => {
    const page = pageDocSchema.parse(base);
    expect(page.createdAt).toEqual(new Date("2026-10-03T00:00:00Z"));
    expect(page.items).toHaveLength(1);
  });

  it("rejects too many items, bad sizes and non-finite numbers", () => {
    const many = Array.from({ length: MAX_PAGE_ITEMS + 1 }, (_, i) => ({
      ...base.items[0]!,
      id: String(i),
    }));
    expect(() => pageDocSchema.parse({ ...base, items: many })).toThrow();
    expect(() => pageDocSchema.parse({ ...base, width: 50 })).toThrow();
    expect(() =>
      pageDocSchema.parse({ ...base, items: [{ ...base.items[0]!, x: Infinity }] }),
    ).toThrow();
    expect(() =>
      pageDocSchema.parse({ ...base, items: [{ ...base.items[0]!, scale: 0 }] }),
    ).toThrow();
  });
});
