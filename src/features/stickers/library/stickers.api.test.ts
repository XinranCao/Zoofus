import { Timestamp } from "firebase/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

// records what is asked of Firestore, answers with `rows`
const fs = vi.hoisted(() => ({
  calls: [] as unknown[][],
  rows: [] as { id: string; data: () => unknown }[],
}));
vi.mock("firebase/firestore", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      fs.calls.push([name, ...args.slice(name === "query" ? 1 : 0)]);
      return { name, args };
    };
  return {
    ...actual,
    collection: () => ({ name: "collection" }),
    doc: (_c: unknown, id: string) => ({ id }),
    query: record("query"),
    orderBy: record("orderBy"),
    limit: record("limit"),
    startAfter: record("startAfter"),
    getDocs: async () => ({ docs: fs.rows }),
    getDoc: async (r: { id: string }) => {
      const row = fs.rows.find((x) => x.id === r.id);
      return { exists: () => !!row, id: r.id, data: () => row?.data() };
    },
    getCountFromServer: vi.fn(),
    serverTimestamp: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
  };
});
vi.mock("@/lib/firebase", () => ({ db: {}, storage: {} }));

import {
  getSticker,
  listRecentStickers,
  listStickerPage,
  STICKER_PAGE,
} from "./stickers.api";

const valid = (n: number) => ({
  name: "s" + n,
  storagePath: `u/stickers/${n}.webp`,
  imageUrl: `https://firebasestorage.googleapis.com/v0/b/x/o/${n}`,
  width: 10,
  height: 10,
  createdAt: Timestamp.fromDate(new Date(2026, 0, 1 + n)),
});
const rows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: "id" + i, data: () => valid(i) }));
const asked = (name: string) => fs.calls.filter((c) => c[0] === name).map((c) => c[1]);

beforeEach(() => {
  fs.calls.length = 0;
  fs.rows = [];
});

describe("reading stickers a part at a time", () => {
  it("the recent list asks for only that many, newest first", async () => {
    await listRecentStickers("u", 12);
    expect(asked("limit")).toEqual([12]);
    expect(asked("orderBy")).toEqual(["createdAt"]);
  });

  it("a full page says where the next one starts; a short one is the last", async () => {
    fs.rows = rows(STICKER_PAGE);
    const first = await listStickerPage("u");
    expect(asked("limit")).toEqual([STICKER_PAGE]);
    expect(asked("startAfter")).toEqual([]);
    expect(first.next).toBe(fs.rows[STICKER_PAGE - 1]);

    fs.calls.length = 0;
    fs.rows = rows(7);
    const second = await listStickerPage("u", first.next);
    expect(asked("startAfter")).toHaveLength(1);
    expect(second.next).toBeUndefined();
  });

  it("finds one sticker by id, or none", async () => {
    fs.rows = rows(3);
    expect(await getSticker("u", "id1")).toMatchObject({ id: "id1", name: "s1" });
    expect(await getSticker("u", "nope")).toBeNull();
  });
});
