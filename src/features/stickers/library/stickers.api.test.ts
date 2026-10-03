import { beforeEach, describe, expect, it, vi } from "vitest";

const SENTINEL = vi.hoisted(() => ({ _methodName: "serverTimestamp" }));
const m = vi.hoisted(() => ({
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getCountFromServer: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
  deleteObject: vi.fn(),
  updateDoc: vi.fn(),
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
  serverTimestamp: vi.fn(() => SENTINEL),
  setDoc: m.setDoc,
  deleteDoc: m.deleteDoc,
  updateDoc: m.updateDoc,
}));
vi.mock("firebase/storage", () => ({
  ref: vi.fn((_s: unknown, path: string) => ({ path })),
  uploadBytes: m.uploadBytes,
  getDownloadURL: m.getDownloadURL,
  deleteObject: m.deleteObject,
}));

import { getDocs, Timestamp } from "firebase/firestore";
import {
  deleteSticker,
  listStickers,
  saveSticker,
  updateStickerEdge,
} from "./stickers.api";
import { MAX_STICKER_BYTES, MAX_STICKERS, StickerLimitError } from "./sticker.schema";
import { DEFAULT_EDGE } from "@/paper/renderSticker";

const blob = (size = 10, type = "image/webp") => {
  const b = new Blob(["x"], { type });
  Object.defineProperty(b, "size", { value: size });
  return b;
};
const input = {
  name: "Froggo",
  sticker: blob(),
  source: blob(),
  width: 10,
  height: 10,
  edge: DEFAULT_EDGE,
  seed: "seed1",
};

beforeEach(() => {
  vi.clearAllMocks();
  m.getCountFromServer.mockResolvedValue({ data: () => ({ count: 0 }) });
  m.uploadBytes.mockResolvedValue(undefined);
  m.getDownloadURL.mockImplementation(
    async (r: { path: string }) => `https://x/${r.path}`,
  );
  m.setDoc.mockResolvedValue(undefined);
  m.updateDoc.mockResolvedValue(undefined);
  m.deleteObject.mockResolvedValue(undefined);
});

describe("saveSticker", () => {
  it("uploads the finished sticker and its edge-less source, then writes the document", async () => {
    const id = await saveSticker("u1", input);
    expect(m.uploadBytes).toHaveBeenCalledTimes(2);
    expect(m.setDoc.mock.calls[0]![1]).toMatchObject({
      name: "Froggo",
      storagePath: `u1/stickers/${id}.webp`,
      sourcePath: `u1/stickers/${id}_src.webp`,
      edge: DEFAULT_EDGE,
      seed: "seed1",
      width: 10,
    });
  });

  it("keeps the server-timestamp sentinel intact (never cloned into a plain map)", async () => {
    await saveSticker("u1", input);
    expect(m.setDoc.mock.calls[0]![1].createdAt).toBe(SENTINEL);
  });

  it("refuses oversized stickers before uploading anything", async () => {
    for (const bad of [
      { sticker: blob(MAX_STICKER_BYTES + 1) },
      { source: blob(MAX_STICKER_BYTES + 1) },
    ]) {
      await expect(saveSticker("u1", { ...input, ...bad })).rejects.toMatchObject({
        code: "size",
      });
    }
    expect(m.uploadBytes).not.toHaveBeenCalled();
  });

  it("refuses to go past the sticker count limit", async () => {
    m.getCountFromServer.mockResolvedValue({ data: () => ({ count: MAX_STICKERS }) });
    await expect(saveSticker("u1", input)).rejects.toBeInstanceOf(StickerLimitError);
    await expect(saveSticker("u1", input)).rejects.toMatchObject({ code: "count" });
    expect(m.uploadBytes).not.toHaveBeenCalled();
  });

  it("removes both uploaded files if writing the document fails", async () => {
    m.setDoc.mockRejectedValue(new Error("firestore down"));
    await expect(saveSticker("u1", input)).rejects.toThrow("firestore down");
    const deleted = m.deleteObject.mock.calls.map((c) => c[0].path as string);
    expect(deleted).toHaveLength(2);
    expect(deleted.some((p) => p.endsWith("_src.webp"))).toBe(true);
  });

  it("still reports the original error when cleanup itself fails", async () => {
    m.setDoc.mockRejectedValue(new Error("firestore down"));
    m.deleteObject.mockRejectedValue({ code: "storage/unauthorized" });
    await expect(saveSticker("u1", input)).rejects.toThrow("firestore down");
  });

  it("stores PNG output (browsers without WebP encoding) with a .png extension", async () => {
    await saveSticker("u1", {
      ...input,
      sticker: blob(10, "image/png"),
      source: blob(10, "image/png"),
    });
    expect(m.setDoc.mock.calls[0]![1]).toMatchObject({
      storagePath: expect.stringMatching(/\.png$/),
    });
    expect(m.uploadBytes.mock.calls[0]![2]).toEqual({ contentType: "image/png" });
  });

  it("never sends undefined fields to Firestore", async () => {
    await saveSticker("u1", {
      ...input,
      edge: { ...DEFAULT_EDGE, fill: { kind: "solid", bg: "sheet-50", ink: undefined } },
    });
    expect(JSON.stringify(m.setDoc.mock.calls[0]![1])).not.toContain("undefined");
    expect(m.setDoc.mock.calls[0]![1].edge.fill).not.toHaveProperty("ink");
  });
});

describe("updateStickerEdge", () => {
  const current = { id: "s1", storagePath: "u1/stickers/s1.webp" };
  const update = {
    sticker: blob(),
    width: 20,
    height: 30,
    edge: DEFAULT_EDGE,
    seed: "s",
  };

  it("uploads under a new name, points the document at it, then deletes the old file", async () => {
    await updateStickerEdge("u1", current, update);
    const newPath = m.uploadBytes.mock.calls[0]![0].path as string;
    expect(newPath).not.toBe(current.storagePath);
    expect(m.updateDoc.mock.calls[0]![1]).toMatchObject({
      storagePath: newPath,
      width: 20,
      height: 30,
    });
    expect(m.deleteObject.mock.calls.map((c) => c[0].path)).toEqual([
      current.storagePath,
    ]);
  });

  it("keeps the old file and removes the new one if the document update fails", async () => {
    m.updateDoc.mockRejectedValue(new Error("nope"));
    await expect(updateStickerEdge("u1", current, update)).rejects.toThrow("nope");
    const deleted = m.deleteObject.mock.calls.map((c) => c[0].path as string);
    expect(deleted).not.toContain(current.storagePath);
    expect(deleted).toHaveLength(1);
  });
});

describe("deleteSticker", () => {
  const sticker = {
    id: "s1",
    storagePath: "u1/stickers/s1.webp",
    sourcePath: "u1/stickers/s1_src.webp",
    thumbnailPath: "u1/stickers/s1_thumb.png",
  };

  it("deletes the document and every file", async () => {
    await deleteSticker("u1", sticker);
    expect(m.deleteDoc).toHaveBeenCalledOnce();
    expect(m.deleteObject).toHaveBeenCalledTimes(3);
  });

  it("succeeds even when the files are already gone", async () => {
    m.deleteObject.mockRejectedValue({ code: "storage/object-not-found" });
    await expect(deleteSticker("u1", sticker)).resolves.toBeUndefined();
  });

  it("still deletes legacy stickers with only one file", async () => {
    await deleteSticker("u1", { id: "s1", storagePath: "u1/stickers/s1.png" });
    expect(m.deleteObject).toHaveBeenCalledTimes(1);
  });
});

describe("listStickers", () => {
  const base = (over: object = {}) => ({
    name: "S",
    storagePath: "u/stickers/a.webp",
    imageUrl: "https://x/a.webp",
    width: 10,
    height: 10,
    createdAt: Timestamp.fromDate(new Date("2026-01-01")),
    ...over,
  });
  const snap = (docs: { id: string; data: object }[]) => ({
    docs: docs.map((d) => ({ id: d.id, data: () => d.data })),
  });

  it("does not fail the whole book because one sticker is unreadable", async () => {
    vi.mocked(getDocs).mockResolvedValue(
      snap([
        { id: "good", data: base() },
        { id: "broken", data: { name: 5 } },
        // saved with an edge the current schema refuses: shown as a plain sticker
        {
          id: "oldedge",
          data: base({
            sourcePath: "u/stickers/a-src.png",
            sourceUrl: "https://x/src",
            edge: { shape: "zigzag", scale: 1, fill: { kind: "dots", bg: "pink-200" } },
          }),
        },
      ]) as never,
    );
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const list = await listStickers("u");
    expect(list.map((s) => s.id)).toEqual(["good", "oldedge"]);
    expect(list[1]!.kind).toBe("legacy");
  });
});
