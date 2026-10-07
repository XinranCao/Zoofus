import { describe, expect, it } from "vitest";
import { journalPayloadSchema } from "./social.schema";

const page = {
  width: 840,
  height: 1188,
  paper: "notebook",
  pattern: "ruled",
  color: "cream-100",
};

describe("a shared journal's payload", () => {
  it("carries only a count when its items travel in the document next to the share", () => {
    const p = journalPayloadSchema.parse({ title: "Trip", page, itemCount: 4 });
    expect(p.items).toBeUndefined();
    expect(p.itemCount).toBe(4);
  });

  it("still carries its items when it was sent before that, dropping unreadable ones", () => {
    const p = journalPayloadSchema.parse({
      title: "Trip",
      page,
      items: [
        {
          id: "a",
          t: "x",
          text: "hi",
          font: "hand",
          size: 40,
          color: "brick-600",
          x: 1,
          y: 1,
          r: 0,
          z: 0,
        },
        { nope: 1 },
      ],
    });
    expect(p.items).toHaveLength(1);
  });
});
