import { act, renderHook } from "@testing-library/react";
import type { KeyboardEvent, ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { EditorStoreProvider, useEditor } from "./store/editorStore";
import { useEditorShortcuts } from "./useEditorShortcuts";

const fit = { width: 400, height: 300 };
const wrapper = ({ children }: { children: ReactNode }) => (
  <EditorStoreProvider>{children}</EditorStoreProvider>
);
const key = (k: string, extra: Partial<KeyboardEvent> = {}) =>
  ({
    key: k,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    preventDefault() {},
    ...extra,
  }) as KeyboardEvent;

function setup() {
  return renderHook(
    () => ({
      onKey: useEditorShortcuts(fit),
      selections: useEditor((s) => s.selections),
      view: useEditor((s) => s.view),
    }),
    { wrapper },
  );
}

describe("the keyboard alone makes a selection and cuts it out", () => {
  it("Enter makes a starting selection, Enter again cuts it", () => {
    const { result } = setup();
    expect(result.current.selections).toHaveLength(0);
    act(() => result.current.onKey(key("Enter")));
    expect(result.current.selections).toHaveLength(1);
    expect(result.current.selections[0]).toMatchObject({
      kind: "rectangle",
      mode: "select",
    });
    expect(result.current.view).toBe("edit");
    act(() => result.current.onKey(key("Enter")));
    expect(result.current.view).toBe("result");
  });

  it("arrows move it, Shift+arrows resize it, Alt+arrows move further, Delete removes it", () => {
    const { result } = setup();
    act(() => result.current.onKey(key(" ")));
    const at = () => result.current.selections[0] as { x: number; width: number };
    const { x, width } = at();
    act(() => result.current.onKey(key("ArrowRight")));
    expect(at().x).toBe(x + 5);
    act(() => result.current.onKey(key("ArrowRight", { altKey: true })));
    expect(at().x).toBe(x + 30);
    act(() => result.current.onKey(key("ArrowRight", { shiftKey: true })));
    expect(at().width).toBe(width + 10);
    act(() => result.current.onKey(key("Delete")));
    expect(result.current.selections).toHaveLength(0);
  });
});
