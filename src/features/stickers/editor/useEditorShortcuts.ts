import { useCallback, type KeyboardEvent } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  createDefaultSelection,
  resizeSelection,
  translateSelection,
} from "./domain/geometry";
import { useEditor } from "./store/editorStore";

const STEP = 5;
const BIG_STEP = 25;
const RESIZE_STEP = 10;

/**
 * Keyboard controls for the canvas, enough to make a sticker without a mouse: Enter (or Space)
 * puts a starting selection (60% of the photo, in the middle) when there is none, and Enter again
 * cuts it out; arrows move the active selection (Alt = bigger steps), Shift+arrows resize it,
 * Delete removes it, Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z or Ctrl+Y redoes.
 * (Escape is left to the dialog: it closes the maker, with a confirmation if there is unsaved work.)
 */
export function useEditorShortcuts(fit: { width: number; height: number }) {
  const {
    selections,
    activeId,
    tool,
    mode,
    addSelection,
    removeSelection,
    updateSelection,
    undo,
    redo,
    confirm,
  } = useEditor(
    useShallow((s) => ({
      selections: s.selections,
      activeId: s.activeId,
      tool: s.tool,
      mode: s.mode,
      addSelection: s.addSelection,
      removeSelection: s.removeSelection,
      updateSelection: s.updateSelection,
      undo: s.undo,
      redo: s.redo,
      confirm: s.confirm,
    })),
  );

  return useCallback(
    (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === "z") {
        e.preventDefault();
        return e.shiftKey ? redo() : undo();
      }
      if (mod && key === "y") {
        e.preventDefault();
        return redo();
      }

      // the keyboard way to make a selection: Space (or Enter, when nothing can be cut yet) puts one
      // in the middle; the freehand tool cannot be drawn without a pointer, so it gives a rectangle
      const cuttable = selections.some((s) => s.mode === "select");
      if (key === " " || (key === "enter" && !cuttable)) {
        e.preventDefault();
        return addSelection(createDefaultSelection(tool, mode, crypto.randomUUID(), fit));
      }

      if (key === "enter") {
        e.preventDefault();
        return confirm();
      }

      const active = selections.find((s) => s.id === activeId);
      if (!active) return;

      if (key === "delete" || key === "backspace") {
        e.preventDefault();
        return removeSelection(active.id);
      }

      const step = e.altKey ? BIG_STEP : STEP;
      const delta: Record<string, [number, number]> = {
        arrowleft: [-1, 0],
        arrowright: [1, 0],
        arrowup: [0, -1],
        arrowdown: [0, 1],
      };
      const dir = delta[key];
      if (dir) {
        e.preventDefault();
        // Shift+arrows resize (right/down grow, left/up shrink), plain arrows move
        const next = e.shiftKey
          ? resizeSelection(active, dir[0] * RESIZE_STEP, dir[1] * RESIZE_STEP)
          : translateSelection(active, dir[0] * step, dir[1] * step);
        updateSelection(active.id, next);
      }
    },
    [
      selections,
      activeId,
      tool,
      mode,
      addSelection,
      removeSelection,
      updateSelection,
      undo,
      redo,
      confirm,
      fit,
    ],
  );
}
