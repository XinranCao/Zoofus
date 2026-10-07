import { Timestamp } from "firebase/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

// answers reads from `docs` by path, records what is written
const fs = vi.hoisted(() => ({
  docs: new Map<string, unknown>(),
  rows: [] as { id: string; data: () => unknown }[],
  asked: [] as string[],
  batch: [] as unknown[][],
}));
vi.mock("firebase/firestore", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const path = (...parts: unknown[]) => parts.slice(1).join("/");
  const op =
    (name: string) =>
    (...args: unknown[]) => {
      fs.asked.push(name);
      return { name, args };
    };
  return {
    ...actual,
    collection: (...a: unknown[]) => ({ path: path(...a) }),
    doc: (...a: unknown[]) =>
      a[0] && typeof a[0] === "object" && "path" in (a[0] as object)
        ? { path: `${(a[0] as { path: string }).path}/${a[1]}` }
        : { path: path(...a) },
    query: op("query"),
    orderBy: op("orderBy"),
    limit: op("limit"),
    startAfter: op("startAfter"),
    getDocs: async () => ({ docs: fs.rows }),
    getDoc: async (r: { path: string }) => ({
      exists: () => fs.docs.has(r.path),
      id: r.path.split("/").pop(),
      data: () => fs.docs.get(r.path),
    }),
    writeBatch: () => ({
      set: (...a: unknown[]) => fs.batch.push(["set", ...a]),
      update: (...a: unknown[]) => fs.batch.push(["update", ...a]),
      commit: async () => {},
    }),
    deleteField: () => "DELETE",
    serverTimestamp: () => "NOW",
    getCountFromServer: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
  };
});
vi.mock("@/lib/firebase", () => ({ db: {}, storage: {} }));
vi.mock("@/lib/storage", () => ({ deleteFileIfExists: vi.fn(), deleteFolder: vi.fn() }));

import {
  getJournal,
  JOURNAL_PAGE,
  listJournalPage,
  loadItems,
  slimJournal,
  withItems,
} from "./journal.api";
import type { Journal } from "./journal.schema";

const page = {
  width: 840,
  height: 1188,
  paper: "notebook",
  pattern: "ruled",
  color: "cream-100",
};
const text = (id: string) => ({
  id,
  t: "x",
  text: "hi",
  font: "hand",
  size: 40,
  color: "brick-600",
  x: 1,
  y: 1,
  r: 0,
  z: 0,
});
const doc = (over: object = {}) => ({
  title: "Trip",
  page,
  createdAt: Timestamp.fromDate(new Date("2026-01-01")),
  updatedAt: Timestamp.fromDate(new Date("2026-01-02")),
  ...over,
});
const rows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: "j" + i,
    data: () => doc({ itemCount: 1 }),
  }));

beforeEach(() => {
  fs.docs.clear();
  fs.rows = [];
  fs.asked.length = 0;
  fs.batch.length = 0;
});

describe("the Journals list, a page at a time", () => {
  it("a full page says where the next one starts; a short one is the last", async () => {
    fs.rows = rows(JOURNAL_PAGE);
    const first = await listJournalPage("u", null);
    expect(first.journals).toHaveLength(JOURNAL_PAGE);
    expect(first.cursor).toBe(fs.rows[JOURNAL_PAGE - 1]);
    expect(fs.asked).not.toContain("startAfter");

    fs.rows = rows(4);
    const second = await listJournalPage("u", first.cursor as never);
    expect(fs.asked).toContain("startAfter");
    expect(second.cursor).toBeNull();
  });

  it("skips a journal that cannot be read, so one bad document never hides the rest", async () => {
    fs.rows = [...rows(2), { id: "bad", data: () => ({ title: "" }) }];
    const r = await listJournalPage("u", null);
    expect(r.journals.map((j) => j.id)).toEqual(["j0", "j1"]);
  });
});

describe("a journal's items", () => {
  it("come from the journal itself when it still carries them (an older one)", async () => {
    const journal = { id: "a", slim: false, items: [text("t1")] } as unknown as Journal;
    expect(await loadItems("u", journal)).toHaveLength(1);
    expect(await withItems("u", journal)).toBe(journal);
  });

  it("are read from their own document otherwise, and a missing one is an empty page", async () => {
    const slim = { id: "a", slim: true, items: [] } as unknown as Journal;
    expect(await loadItems("u", slim)).toEqual([]);
    fs.docs.set("users/u/journals/a/body/items", { items: [text("t1"), { bad: 1 }] });
    expect(await loadItems("u", slim)).toHaveLength(1); // the unreadable one is dropped
    expect((await withItems("u", slim)).items).toHaveLength(1);
  });

  it("are filled in when one journal is opened", async () => {
    fs.docs.set("users/u/journals/a", doc({ itemCount: 2 }));
    fs.docs.set("users/u/journals/a/body/items", { items: [text("t1"), text("t2")] });
    const j = await getJournal("u", "a");
    expect(j?.items).toHaveLength(2);
    expect(await getJournal("u", "missing")).toBeNull();
  });
});

describe("moving an older journal's items out", () => {
  it("writes them to their own document and takes them out of the journal in one batch", async () => {
    fs.docs.set("users/u/journals/a", doc({ items: [text("t1")] }));
    const moved = await slimJournal("u", "a");
    expect(moved).toHaveLength(1);
    const kinds = fs.batch.map((b) => b[0]);
    expect(kinds).toEqual(["set", "update"]);
    expect(fs.batch[1]![2]).toEqual({ items: "DELETE", itemCount: 1 });
  });

  it("does nothing when the journal has no items inside (already moved, or saved meanwhile)", async () => {
    fs.docs.set("users/u/journals/a", doc({ itemCount: 1 }));
    expect(await slimJournal("u", "a")).toBeNull();
    expect(await slimJournal("u", "gone")).toBeNull();
    expect(fs.batch).toEqual([]);
  });
});
