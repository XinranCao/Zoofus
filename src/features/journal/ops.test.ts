import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE, MAX_JOURNAL_ITEMS, type Item } from "./journal.schema";
import { applyOps, reorder, topZ, type PageState } from "./ops";

const sticker = (id: string, z = 0, x = 0): Item => ({
  t: "s",
  id,
  ref: "s1",
  sc: 1,
  x,
  y: 0,
  r: 0,
  z,
});
const start = (items: Item[] = []): PageState => ({ page: DEFAULT_PAGE, items });

describe("applyOps", () => {
  it("adds, replaces and removes, and returns operations that undo each", () => {
    const a = applyOps(start(), [{ k: "put", item: sticker("a") }]);
    expect(a.state.items.map((i) => i.id)).toEqual(["a"]);
    expect(a.undo).toEqual([{ k: "del", id: "a" }]);

    const b = applyOps(a.state, [{ k: "put", item: sticker("a", 0, 50) }]);
    expect(b.state.items[0]!.x).toBe(50);
    expect(b.undo).toEqual([{ k: "put", item: sticker("a") }]);

    const c = applyOps(b.state, [{ k: "del", id: "a" }]);
    expect(c.state.items).toEqual([]);
    expect(applyOps(c.state, c.undo).state.items[0]!.x).toBe(50);
  });

  it("undoing a batch restores the state exactly", () => {
    const s0 = start([sticker("a", 0), sticker("b", 1)]);
    const r = applyOps(s0, [
      { k: "del", id: "a" },
      { k: "put", item: sticker("c", 2) },
      { k: "put", item: sticker("b", 1, 9) },
      { k: "page", page: { ...DEFAULT_PAGE, paper: "magazine", pattern: "gloss" } },
    ]);
    expect(r.state.page.paper).toBe("magazine");
    expect(applyOps(r.state, r.undo).state).toEqual(s0);
  });

  it("keeps items in drawing order", () => {
    const r = applyOps(start(), [
      { k: "put", item: sticker("top", 5) },
      { k: "put", item: sticker("low", 1) },
    ]);
    expect(r.state.items.map((i) => i.id)).toEqual(["low", "top"]);
  });

  it("skips what cannot apply", () => {
    const r = applyOps(start(), [{ k: "del", id: "ghost" }]);
    expect(r.applied).toEqual([]);
    expect(r.undo).toEqual([]);
  });

  it("never grows past the item limit", () => {
    const full = start(
      Array.from({ length: MAX_JOURNAL_ITEMS }, (_, i) => sticker("i" + i, i)),
    );
    const r = applyOps(full, [{ k: "put", item: sticker("extra", 999) }]);
    expect(r.state.items).toHaveLength(MAX_JOURNAL_ITEMS);
    expect(r.applied).toEqual([]);
  });
});

describe("reorder", () => {
  it("brings an item to the front or sends it to the back", () => {
    const items = [sticker("a", 0), sticker("b", 1), sticker("c", 2)];
    const front = applyOps(start(items), reorder(items, "a", "front")).state.items;
    expect(front[front.length - 1]!.id).toBe("a");
    const back = applyOps(start(items), reorder(items, "c", "back")).state.items;
    expect(back[0]!.id).toBe("c");
    expect(reorder(items, "c", "front")).toEqual([]);
    expect(topZ(items)).toBe(3);
  });
});

describe("reorder one place", () => {
  const order = (items: Item[]) => items.map((i) => i.id);
  it("moves an item past its neighbour, up or down, with three or more layers", () => {
    const items = [sticker("a", 0), sticker("b", 1), sticker("c", 2)];
    const up = applyOps(start(items), reorder(items, "a", "up")).state.items;
    expect(order(up)).toEqual(["b", "a", "c"]);
    const down = applyOps(start(items), reorder(items, "c", "down")).state.items;
    expect(order(down)).toEqual(["a", "c", "b"]);
    const mid = applyOps(start(items), reorder(items, "b", "up")).state.items;
    expect(order(mid)).toEqual(["a", "c", "b"]);
  });
  it("does nothing at the ends, and separates items that share a level", () => {
    const items = [sticker("a", 0), sticker("b", 1)];
    expect(reorder(items, "b", "up")).toEqual([]);
    expect(reorder(items, "a", "down")).toEqual([]);
    const same = [sticker("a", 3), sticker("b", 3)];
    const moved = applyOps(start(same), reorder(same, "a", "up")).state.items;
    expect(moved.find((i) => i.id === "a")!.z).toBeGreaterThan(3);
  });
});
