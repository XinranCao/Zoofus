import { describe, expect, it } from "vitest";
import { buildExport } from "./account.export";

describe("buildExport", () => {
  it("includes everything and a timestamp", () => {
    const out = buildExport(
      { profile: null, stickers: [], tapes: [], journals: [], collections: [] },
      new Date("2026-10-03T00:00:00Z"),
    );
    expect(out).toEqual({
      exportedAt: "2026-10-03T00:00:00.000Z",
      profile: null,
      stickers: [],
      tapes: [],
      journals: [],
      collections: [],
    });
  });

  it("serialises to JSON with dates as ISO strings", () => {
    const createdAt = new Date("2026-10-02T10:00:00Z");
    const json = JSON.stringify(
      buildExport({
        profile: null,
        stickers: [
          {
            id: "a",
            name: "Froggo",
            storagePath: "u/stickers/a.png",
            imageUrl: "https://x/a.png",
            kind: "legacy",
            width: 1,
            height: 1,
            createdAt,
          },
        ],
        tapes: [],
        journals: [],
        collections: [],
      }),
    );
    expect(json).toContain("2026-10-02T10:00:00.000Z");
  });
});
