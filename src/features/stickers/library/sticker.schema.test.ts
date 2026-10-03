import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import { stickerDocSchema } from "./sticker.schema";

const doc = {
  name: "Froggo",
  storagePath: "u1/stickers/a.png",
  imageUrl: "https://example.com/a.png",
  width: 400,
  height: 300,
  createdAt: Timestamp.fromDate(new Date("2026-10-02T10:00:00Z")),
};

describe("stickerDocSchema", () => {
  it("parses a stored sticker and converts the timestamp to a Date", () => {
    const parsed = stickerDocSchema.parse(doc);
    expect(parsed.createdAt).toEqual(new Date("2026-10-02T10:00:00Z"));
  });

  it("rejects bad dimensions and missing fields", () => {
    expect(() => stickerDocSchema.parse({ ...doc, width: 0 })).toThrow();
    expect(() => stickerDocSchema.parse({ ...doc, name: undefined })).toThrow();
  });
});

describe("stickerKind", () => {
  it("is editable only when the edge-less source is stored", async () => {
    const { stickerKind } = await import("./sticker.schema");
    expect(stickerKind({ sourceUrl: "u", sourcePath: "p" })).toBe("editable");
    expect(stickerKind({})).toBe("legacy");
    expect(stickerKind({ sourceUrl: "u" })).toBe("legacy");
  });
});
