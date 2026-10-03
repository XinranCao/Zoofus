import { beforeEach, describe, expect, it } from "vitest";
import { createFreehand, createShape } from "../domain/geometry";
import { createEditorStore, type EditorStore } from "./editorStore";

let store: EditorStore;
const stroke = (id: string) => createFreehand([0, 0, 10, 10, 20, 0], "select", id);

beforeEach(() => {
  store = createEditorStore();
});

describe("editor store history", () => {
  it("adds a selection and makes it active", () => {
    store.getState().addSelection(stroke("a"));
    expect(store.getState().selections.map((s) => s.id)).toEqual(["a"]);
    expect(store.getState().activeId).toBe("a");
  });

  it("undoes and redoes", () => {
    const { addSelection } = store.getState();
    addSelection(stroke("a"));
    addSelection(stroke("b"));

    store.getState().undo();
    expect(store.getState().selections.map((s) => s.id)).toEqual(["a"]);
    expect(store.getState().activeId).toBeNull();

    store.getState().redo();
    expect(store.getState().selections.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("does nothing when there is nothing to undo or redo", () => {
    store.getState().undo();
    store.getState().redo();
    expect(store.getState().selections).toEqual([]);
  });

  it("clears the redo stack after a new change", () => {
    const { addSelection } = store.getState();
    addSelection(stroke("a"));
    store.getState().undo();
    store.getState().addSelection(stroke("b"));
    expect(store.getState().future).toEqual([]);
  });

  it("updates one selection and can undo the update", () => {
    store.getState().addSelection(createShape("rectangle", "select", "r"));
    store.getState().updateSelection("r", { x: 5 });
    expect(store.getState().selections[0]).toMatchObject({ x: 5 });
    store.getState().undo();
    expect(store.getState().selections[0]).toMatchObject({ x: 100 });
  });

  it("removes a selection and clears the active id", () => {
    store.getState().addSelection(stroke("a"));
    store.getState().removeSelection("a");
    expect(store.getState().selections).toEqual([]);
    expect(store.getState().activeId).toBeNull();
  });

  it("clear is undoable", () => {
    store.getState().addSelection(stroke("a"));
    store.getState().clear();
    expect(store.getState().selections).toEqual([]);
    store.getState().undo();
    expect(store.getState().selections).toHaveLength(1);
  });

  it("starts a fresh session when the image changes", () => {
    store.getState().addSelection(stroke("a"));
    store.getState().setImage("blob:new");
    const s = store.getState();
    expect(s.selections).toEqual([]);
    expect(s.past).toEqual([]);
    expect(s.imageUrl).toBe("blob:new");
  });

  it("keeps the border settings when the image changes", () => {
    store.getState().setBorder({ width: 20 });
    store.getState().setImage("blob:new");
    expect(store.getState().border.width).toBe(20);
  });

  it("limits history to 100 steps", () => {
    for (let i = 0; i < 120; i++) store.getState().addSelection(stroke(String(i)));
    expect(store.getState().past).toHaveLength(100);
  });
});
