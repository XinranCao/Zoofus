import {
  createContext,
  createElement,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import { DEFAULT_EDGE, type EdgeSpec } from "@/paper/renderSticker";
import type { Selection, SelectionMode, Tool } from "../domain/types";

const HISTORY_LIMIT = 100;

export interface EditorState {
  imageUrl: string | null;
  view: "edit" | "result";
  tool: Tool;
  mode: SelectionMode;
  selections: Selection[];
  activeId: string | null;
  past: Selection[][];
  future: Selection[][];
  /** The sticker edge chosen in step 2; saved with the sticker. */
  edge: EdgeSpec;
  /** Seed for the sticker's edge shape: same seed, same edge, on screen and in the file. */
  seed: string;
  imageStatus: "idle" | "loading" | "error";
  imageError: string | null;

  setImage: (url: string | null) => void;
  setTool: (tool: Tool) => void;
  setMode: (mode: SelectionMode) => void;
  setActive: (id: string | null) => void;
  addSelection: (selection: Selection) => void;
  /** Patches one selection; call once per gesture (drag end), not per frame. */
  updateSelection: (id: string, patch: Partial<Selection>) => void;
  removeSelection: (id: string) => void;
  clear: () => void;
  undo: () => void;
  redo: () => void;
  confirm: () => void;
  backToEdit: () => void;
  setEdge: (patch: Partial<EdgeSpec>) => void;
  setImageStatus: (status: "idle" | "loading" | "error", error?: string | null) => void;
}

export type EditorStore = StoreApi<EditorState>;

export function createEditorStore(): EditorStore {
  return createStore<EditorState>()((set, get) => {
    /** Apply a new selections list and record the previous one for undo. */
    const commit = (next: Selection[], activeId: string | null) => {
      const { selections, past } = get();
      set({
        selections: next,
        activeId,
        past: [...past, selections].slice(-HISTORY_LIMIT),
        future: [],
      });
    };

    return {
      imageUrl: null,
      view: "edit",
      tool: "freehand",
      mode: "select",
      selections: [],
      activeId: null,
      past: [],
      future: [],
      edge: DEFAULT_EDGE,
      seed: crypto.randomUUID(),
      imageStatus: "idle",
      imageError: null,

      // A new image starts a fresh session.
      setImage: (url) =>
        set({
          imageUrl: url,
          seed: crypto.randomUUID(),
          imageStatus: url ? "idle" : get().imageStatus,
          imageError: null,
          view: "edit",
          selections: [],
          activeId: null,
          past: [],
          future: [],
        }),
      setTool: (tool) => set({ tool }),
      setMode: (mode) => set({ mode }),
      setActive: (id) => set({ activeId: id }),

      addSelection: (selection) => commit([...get().selections, selection], selection.id),

      updateSelection: (id, patch) =>
        commit(
          get().selections.map((s) =>
            s.id === id ? ({ ...s, ...patch } as Selection) : s,
          ),
          get().activeId,
        ),

      removeSelection: (id) =>
        commit(
          get().selections.filter((s) => s.id !== id),
          get().activeId === id ? null : get().activeId,
        ),

      clear: () => {
        if (get().selections.length > 0) commit([], null);
      },

      undo: () => {
        const { past, selections, future, activeId } = get();
        const previous = past[past.length - 1];
        if (!previous) return;
        set({
          selections: previous,
          past: past.slice(0, -1),
          future: [selections, ...future],
          activeId: previous.some((s) => s.id === activeId) ? activeId : null,
        });
      },

      redo: () => {
        const { past, selections, future, activeId } = get();
        const next = future[0];
        if (!next) return;
        set({
          selections: next,
          past: [...past, selections],
          future: future.slice(1),
          activeId: next.some((s) => s.id === activeId) ? activeId : null,
        });
      },

      confirm: () => set({ view: "result", activeId: null }),
      backToEdit: () => set({ view: "edit" }),
      setEdge: (patch) => set({ edge: { ...get().edge, ...patch } }),
      setImageStatus: (imageStatus, imageError = null) =>
        set({ imageStatus, imageError }),
    };
  });
}

const EditorStoreContext = createContext<EditorStore | null>(null);

/** One editor store per mounted editor, so state resets when the dialog closes. */
export function EditorStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createEditorStore);
  return createElement(EditorStoreContext.Provider, { value: store }, children);
}

export function useEditor<T>(selector: (state: EditorState) => T): T {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error("useEditor must be used inside <EditorStoreProvider>");
  return useStore(store, selector);
}
