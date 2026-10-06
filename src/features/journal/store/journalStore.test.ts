import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE, type Item } from "../journal.schema";
import { createJournalStore } from "./journalStore";

const text = (id: string): Item => ({
  t: "x",
  id,
  x: 10,
  y: 10,
  r: 0,
  z: 0,
  text: id,
  font: "typewriter",
  size: 20,
  color: "cocoa-800",
});
const line = (id: string): Item => ({
  t: "p",
  id,
  x: 0,
  y: 0,
  r: 0,
  z: 1,
  tool: "pen",
  color: "cocoa-800",
  size: 4,
  pts: "a b 1 1",
});

describe("choosing several things", () => {
  const make = () => {
    const s = createJournalStore();
    s.getState().load(DEFAULT_PAGE, [text("a"), text("b"), line("p")]);
    return s;
  };

  it("keeps a group of two or more, with no single choice", () => {
    const s = make();
    s.getState().selectGroup(["a", "b"]);
    expect(s.getState()).toMatchObject({ selectedId: null, group: ["a", "b"] });
  });

  it("makes one thing with handles a plain choice, but keeps a lone pen line a group", () => {
    const s = make();
    s.getState().selectGroup(["a"]);
    expect(s.getState()).toMatchObject({ selectedId: "a", group: [] });
    s.getState().selectGroup(["p"]);
    expect(s.getState()).toMatchObject({ selectedId: null, group: ["p"] });
  });

  it("forgets the group when one thing is chosen, on undo and when things go", () => {
    const s = make();
    s.getState().selectGroup(["a", "b"]);
    s.getState().select("a");
    expect(s.getState().group).toEqual([]);
    s.getState().selectGroup(["a", "b"]);
    s.getState().apply([{ k: "del", id: "b" }]);
    expect(s.getState().group).toEqual(["a"]);
    s.getState().undo();
    expect(s.getState().group).toEqual([]);
  });

  it("counts pastes of what was copied", () => {
    const s = make();
    expect(s.getState().countPaste()).toBe(0);
    s.getState().setClip([text("a")]);
    expect(s.getState().countPaste()).toBe(1);
    expect(s.getState().countPaste()).toBe(2);
    s.getState().setClip([text("b")]);
    expect(s.getState().countPaste()).toBe(1);
  });
});
