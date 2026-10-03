import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getCountFromServer: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
  deleteObject: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({ db: {}, storage: {} }));
vi.mock("firebase/firestore", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  collection: vi.fn(() => "collection"),
  doc: vi.fn((_c: unknown, id: string) => ({ id })),
  getCountFromServer: m.getCountFromServer,
  getDocs: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(() => "SERVER_TIME"),
  setDoc: m.setDoc,
  deleteDoc: m.deleteDoc,
  updateDoc: vi.fn(),
}));
vi.mock("firebase/storage", () => ({
  ref: vi.fn((_s: unknown, path: string) => ({ path })),
  uploadBytes: m.uploadBytes,
  getDownloadURL: m.getDownloadURL,
  deleteObject: m.deleteObject,
}));

import { deleteSticker, saveSticker } from "./stickers.api";
import { MAX_STICKER_BYTES, MAX_STICKERS, StickerLimitError } from "./sticker.schema";

const blob = (size = 10) => {
  const b = new Blob(["x"]);
  Object.defineProperty(b, "size", { value: size });
  return b;
};
const input = { blob: blob(), thumbnail: blob(), name: "Froggo", width: 10, height: 10 };

beforeEach(() => {
  vi.clearAllMocks();
  m.getCountFromServer.mockResolvedValue({ data: () => ({ count: 0 }) });
  m.uploadBytes.mockResolvedValue(undefined);
  m.getDownloadURL.mockImplementation(
    async (r: { path: string }) => `https://x/${r.path}`,
  );
  m.setDoc.mockResolvedValue(undefined);
  m.deleteObject.mockResolvedValue(undefined);
});

describe("saveSticker", () => {
  it("uploads the PNG and thumbnail, then writes the document", async () => {
    const id = await saveSticker("u1", input);
    expect(m.uploadBytes).toHaveBeenCalledTimes(2);
    const data = m.setDoc.mock.calls[0]![1];
    expect(data).toMatchObject({
      name: "Froggo",
      storagePath: `u1/stickers/${id}.png`,
      thumbnailPath: `u1/stickers/${id}_thumb.png`,
      createdAt: "SERVER_TIME",
    });
  });

  it("refuses oversized stickers before uploading anything", async () => {
    await expect(
      saveSticker("u1", { ...input, blob: blob(MAX_STICKER_BYTES + 1) }),
    ).rejects.toBeInstanceOf(StickerLimitError);
    expect(m.uploadBytes).not.toHaveBeenCalled();
  });

  it("refuses to go past the sticker count limit", async () => {
    m.getCountFromServer.mockResolvedValue({ data: () => ({ count: MAX_STICKERS }) });
    await expect(saveSticker("u1", input)).rejects.toBeInstanceOf(StickerLimitError);
    expect(m.uploadBytes).not.toHaveBeenCalled();
  });

  it("removes uploaded files if writing the document fails", async () => {
    m.setDoc.mockRejectedValue(new Error("firestore down"));
    await expect(saveSticker("u1", input)).rejects.toThrow("firestore down");
    const deleted = m.deleteObject.mock.calls.map((c) => c[0].path as string);
    expect(deleted).toHaveLength(2);
    expect(deleted.some((p) => p.endsWith(".png") && !p.endsWith("_thumb.png"))).toBe(
      true,
    );
    expect(deleted.some((p) => p.endsWith("_thumb.png"))).toBe(true);
  });

  it("still reports the original error when cleanup itself fails", async () => {
    m.setDoc.mockRejectedValue(new Error("firestore down"));
    m.deleteObject.mockRejectedValue({ code: "storage/unauthorized" });
    await expect(saveSticker("u1", input)).rejects.toThrow("firestore down");
  });
});

describe("deleteSticker", () => {
  const sticker = {
    id: "s1",
    storagePath: "u1/stickers/s1.png",
    thumbnailPath: "u1/stickers/s1_thumb.png",
  };

  it("deletes the document and both files", async () => {
    await deleteSticker("u1", sticker);
    expect(m.deleteDoc).toHaveBeenCalledOnce();
    expect(m.deleteObject).toHaveBeenCalledTimes(2);
  });

  it("succeeds even when the files are already gone", async () => {
    m.deleteObject.mockRejectedValue({ code: "storage/object-not-found" });
    await expect(deleteSticker("u1", sticker)).resolves.toBeUndefined();
  });

  it("works for older stickers without a thumbnail", async () => {
    await deleteSticker("u1", { id: "s1", storagePath: "u1/stickers/s1.png" });
    expect(m.deleteObject).toHaveBeenCalledTimes(1);
  });
});
