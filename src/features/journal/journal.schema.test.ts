import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import { journalDocSchema } from "./journal.schema";

const base = {
  title: "Trip",
  page: {
    width: 840,
    height: 1188,
    paper: "notebook",
    pattern: "ruled",
    color: "cream-100",
  },
  createdAt: Timestamp.fromDate(new Date("2026-01-01")),
  updatedAt: Timestamp.fromDate(new Date("2026-01-02")),
};
const text = {
  id: "t1",
  t: "x",
  text: "hi",
  font: "hand",
  size: 40,
  color: "brick-600",
  x: 1,
  y: 1,
  r: 0,
  z: 0,
};

describe("a journal document", () => {
  it("is slim when its items live in their own document: a count, no items, not loaded", () => {
    const j = journalDocSchema.parse({ ...base, itemCount: 3 });
    expect(j).toMatchObject({ slim: true, itemCount: 3, items: [] });
  });

  it("is not slim when an older journal still carries its items, and counts them", () => {
    const j = journalDocSchema.parse({ ...base, items: [text, { bad: true }] });
    expect(j.slim).toBe(false);
    expect(j.items).toHaveLength(1); // the unreadable one is dropped, the journal still reads
    expect(j.itemCount).toBe(1);
  });

  it("reads a slim journal with no count as empty, and ignores a count that is not a number", () => {
    expect(journalDocSchema.parse(base)).toMatchObject({ slim: true, itemCount: 0 });
    expect(journalDocSchema.parse({ ...base, itemCount: "many" }).itemCount).toBe(0);
  });
});
