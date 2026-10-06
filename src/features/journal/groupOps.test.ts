import { describe, expect, it } from "vitest";
import {
  boxesTouch,
  copyOf,
  movedItem,
  moveOf,
  moveOps,
  pasteOps,
  unionBox,
} from "./groupOps";
import { MAX_JOURNAL_ITEMS, type Item } from "./journal.schema";
import { decodeStroke, encodeStroke } from "./strokes";

const sticker = (id: string, x: number, y: number, z = 0): Item => ({
  t: "s",
  id,
  ref: "r",
  x,
  y,
  r: 10,
  z,
  sc: 1,
});
const stroke = (id: string, z = 0): Item => ({
  t: "p",
  id,
  x: 0,
  y: 0,
  r: 0,
  z,
  tool: "pen",
  color: "cocoa-800",
  size: 4,
  pts: encodeStroke([10, 10, 30, 10]),
});

describe("group moves", () => {
  it("turns a point about the centre and then shifts it", () => {
    const [x, y] = moveOf({ cx: 0, cy: 0, dx: 5, dy: 0, deg: 90 }, 10, 0);
    expect(x).toBeCloseTo(5);
    expect(y).toBeCloseTo(10);
  });

  it("moves a sticker and adds the turn to its own", () => {
    const m = movedItem(sticker("a", 100, 100), {
      cx: 100,
      cy: 100,
      dx: 20,
      dy: -10,
      deg: 30,
    });
    expect(m).toMatchObject({ x: 120, y: 90, r: 40 });
  });

  it("keeps a turned item's angle inside the stored range", () => {
    const m = movedItem(sticker("a", 0, 0), { cx: 0, cy: 0, dx: 0, dy: 0, deg: 350 });
    expect(m.r).toBe(0);
  });

  it("rewrites the points of a pen stroke", () => {
    const m = movedItem(stroke("p"), { cx: 0, cy: 0, dx: 10, dy: 20, deg: 0 });
    if (m.t !== "p") throw new Error("kind");
    expect(decodeStroke(m.pts)).toEqual([20, 30, 40, 30]);
    expect(m).toMatchObject({ x: 0, y: 0, r: 0 });
  });

  it("makes one put for each chosen item and nothing for the rest", () => {
    const items = [sticker("a", 0, 0), sticker("b", 5, 5), stroke("p")];
    const ops = moveOps(items, ["a", "p"], { cx: 0, cy: 0, dx: 1, dy: 1, deg: 0 });
    expect(ops.map((o) => (o.k === "put" ? o.item.id : ""))).toEqual(["a", "p"]);
  });
});

describe("boxes", () => {
  it("knows when two boxes touch", () => {
    expect(boxesTouch({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 5, w: 3, h: 3 })).toBe(
      true,
    );
    expect(boxesTouch({ x: 0, y: 0, w: 10, h: 10 }, { x: 11, y: 5, w: 3, h: 3 })).toBe(
      false,
    );
  });
  it("joins boxes", () => {
    expect(
      unionBox([
        { x: 0, y: 0, w: 2, h: 2 },
        { x: 5, y: 5, w: 1, h: 3 },
      ]),
    ).toEqual({
      x: 0,
      y: 0,
      w: 6,
      h: 8,
    });
    expect(unionBox([])).toBeNull();
  });
});

describe("copy and paste", () => {
  it("copies in stacking order", () => {
    const items = [sticker("a", 0, 0, 5), sticker("b", 0, 0, 1), sticker("c", 0, 0, 3)];
    expect(copyOf(items, ["a", "b"]).map((i) => i.id)).toEqual(["b", "a"]);
  });

  it("pastes new items on top, shifted further each time", () => {
    const items = [sticker("a", 100, 100, 4)];
    const first = pasteOps(items, items, 1);
    const second = pasteOps(items, items, 2);
    expect(first.ids).toHaveLength(1);
    expect(first.ids[0]).not.toBe("a");
    const put = (r: typeof first) => (r.ops[0]!.k === "put" ? r.ops[0]!.item : null)!;
    expect(put(first)).toMatchObject({ x: 128, y: 128, z: 5 });
    expect(put(second)).toMatchObject({ x: 156, y: 156 });
  });

  it("pastes a stroke by moving its points", () => {
    const p = stroke("p");
    const r = pasteOps([p], [p], 1);
    const it = r.ops[0]!.k === "put" ? r.ops[0]!.item : null;
    expect(it && it.t === "p" && decodeStroke(it.pts)).toEqual([38, 38, 58, 38]);
  });

  it("does nothing when the copies would not fit", () => {
    const full = Array.from({ length: MAX_JOURNAL_ITEMS }, (_, i) =>
      sticker("i" + i, 0, 0, i),
    );
    expect(pasteOps(full, [full[0]!], 1).ops).toEqual([]);
  });
});
