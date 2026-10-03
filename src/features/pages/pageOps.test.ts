import { describe, expect, it } from "vitest";
import { MAX_PAGE_ITEMS, type PageItem } from "./page.schema";
import {
  addItem,
  bringToFront,
  inDrawOrder,
  pruneMissingStickers,
  removeItem,
  sendToBack,
  updateItem,
} from "./pageOps";

const item = (id: string, z: number, stickerId = "s"): PageItem => ({
  id,
  stickerId,
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
  z,
});

describe("pageOps", () => {
  it("adds a sticker on top of the stack", () => {
    const items = addItem([item("a", 0), item("b", 5)], "s2", { x: 10, y: 20 }, "c");
    expect(items.at(-1)).toMatchObject({
      id: "c",
      stickerId: "s2",
      x: 10,
      y: 20,
      z: 6,
      scale: 1,
    });
  });

  it("starts the stack at z = 0", () => {
    expect(addItem([], "s", { x: 0, y: 0 }, "a")[0]!.z).toBe(0);
  });

  it("does not add past the item limit", () => {
    const full = Array.from({ length: MAX_PAGE_ITEMS }, (_, i) => item(String(i), i));
    expect(addItem(full, "s", { x: 0, y: 0 }, "x")).toBe(full);
  });

  it("updates only the matching item and does not mutate the input", () => {
    const items = [item("a", 0), item("b", 1)];
    const next = updateItem(items, "a", { x: 99 });
    expect(next[0]!.x).toBe(99);
    expect(next[1]).toBe(items[1]);
    expect(items[0]!.x).toBe(0);
  });

  it("removes an item", () => {
    expect(removeItem([item("a", 0), item("b", 1)], "a").map((i) => i.id)).toEqual(["b"]);
  });

  it("brings to front and sends to back", () => {
    const items = [item("a", 0), item("b", 1), item("c", 2)];
    expect(inDrawOrder(bringToFront(items, "a")).map((i) => i.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
    expect(inDrawOrder(sendToBack(items, "c")).map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("prunes items whose sticker was deleted", () => {
    const items = [item("a", 0, "keep"), item("b", 1, "gone")];
    expect(pruneMissingStickers(items, new Set(["keep"])).map((i) => i.id)).toEqual([
      "a",
    ]);
  });
});
