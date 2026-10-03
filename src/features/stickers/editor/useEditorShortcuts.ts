import { useCallback, type KeyboardEvent } from "react";
import { useShallow } from "zustand/react/shallow";
import { translateSelection } from "./domain/geometry";
import { useEditor } from "./store/editorStore";

const STEP = 2;
const BIG_STEP = 20;

/**
 * Keyboard controls for the canvas: arrows move the active selection (Shift = bigger steps),
 * Delete removes it, Escape deselects, Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z or Ctrl+Y redoes.
 */
export function useEditorShortcuts() {
  const {
    selections,
    activeId,
    removeSelection,
    updateSelection,
    setActive,
    undo,
    redo,
  } = useEditor(
    useShallow((s) => ({
      selections: s.selections,
      activeId: s.activeId,
      removeSelection: s.removeSelection,
      updateSelection: s.updateSelection,
      setActive: s.setActive,
      undo: s.undo,
      redo: s.redo,
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

      const active = selections.find((s) => s.id === activeId);
      if (!active) return;

      if (key === "delete" || key === "backspace") {
        e.preventDefault();
        return removeSelection(active.id);
      }
      if (key === "escape") return setActive(null);

      const step = e.shiftKey ? BIG_STEP : STEP;
      const delta: Record<string, [number, number]> = {
        arrowleft: [-step, 0],
        arrowright: [step, 0],
        arrowup: [0, -step],
        arrowdown: [0, step],
      };
      const move = delta[key];
      if (move) {
        e.preventDefault();
        const moved = translateSelection(active, move[0], move[1]);
        updateSelection(active.id, moved);
      }
    },
    [selections, activeId, removeSelection, updateSelection, setActive, undo, redo],
  );
}
