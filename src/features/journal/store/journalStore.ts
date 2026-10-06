import {
  createContext,
  createElement,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import { DEFAULT_FONT } from "../fonts";
import {
  DEFAULT_PAGE,
  type InkName,
  type Item,
  type PageSpec,
  type StrokeTool,
} from "../journal.schema";
import { applyOps, type Op } from "../ops";

const HISTORY_LIMIT = 100;

export type JournalTool = "select" | "draw" | "erase" | "text";

interface Entry {
  redo: Op[];
  undo: Op[];
}

export interface PenState {
  tool: StrokeTool;
  color: InkName;
  size: number;
}
export interface TextStyle {
  font: string;
  size: number;
  color: InkName;
  bold: boolean;
}

export interface JournalState {
  page: PageSpec;
  items: Item[];
  selectedId: string | null;
  /** Several things chosen together (an area dragged on the page, or Select all); `selectedId` is then null. */
  group: string[];
  /** What Copy or Cut last took, and how many times it has been pasted (each copy lands further along). */
  clip: { items: Item[]; pastes: number } | null;
  tool: JournalTool;
  pen: PenState;
  text: TextStyle;
  past: Entry[];
  future: Entry[];
  /** Changed since it was loaded or last saved. */
  dirty: boolean;

  load: (page: PageSpec, items: Item[]) => void;
  /**
   * Applies operations. `record` puts them on the undo list (what the person did); `remote` marks
   * changes that arrived from someone else, which are not sent back out.
   */
  apply: (
    ops: Op[],
    opts?: { record?: boolean; remote?: boolean; coalesce?: string },
  ) => void;
  undo: () => void;
  redo: () => void;
  select: (id: string | null) => void;
  /** Choose these things together. One thing that can take handles is chosen as a single object. */
  selectGroup: (ids: string[]) => void;
  setClip: (items: Item[]) => void;
  /** Counts a paste and returns how many have been made, this one included. */
  countPaste: () => number;
  setTool: (tool: JournalTool) => void;
  setPen: (patch: Partial<PenState>) => void;
  setText: (patch: Partial<TextStyle>) => void;
  markSaved: () => void;
  /** Called with every locally made operation list (to save or to send to others). */
  bind: (listener: ((ops: Op[]) => void) | null) => void;
}

export type JournalStore = StoreApi<JournalState>;

export function createJournalStore(): JournalStore {
  let listener: ((ops: Op[]) => void) | null = null;
  let last: { key: string; at: number } | null = null;
  return createStore<JournalState>()((set, get) => ({
    page: DEFAULT_PAGE,
    items: [],
    selectedId: null,
    group: [],
    clip: null,
    tool: "select",
    pen: { tool: "pen", color: "cocoa-800", size: 4 },
    text: { font: DEFAULT_FONT, size: 44, color: "cocoa-800", bold: false },
    past: [],
    future: [],
    dirty: false,

    load: (page, items) =>
      set({
        page,
        items,
        selectedId: null,
        group: [],
        past: [],
        future: [],
        dirty: false,
      }),

    apply: (ops, { record = true, remote = false, coalesce } = {}) => {
      const { page, items, past, selectedId, group } = get();
      const r = applyOps({ page, items }, ops);
      if (r.applied.length === 0) return;
      const next: Partial<JournalState> = {
        page: r.state.page,
        items: r.state.items,
        dirty: true,
        selectedId:
          selectedId && r.state.items.some((i) => i.id === selectedId)
            ? selectedId
            : null,
        group: group.filter((id) => r.state.items.some((i) => i.id === id)),
      };
      if (record) {
        const now = Date.now();
        const tail = past[past.length - 1];
        if (coalesce && last && last.key === coalesce && now - last.at < 1500 && tail) {
          // the same thing being changed again and again (typing, dragging a slider): one undo step
          next.past = [...past.slice(0, -1), { redo: r.applied, undo: tail.undo }];
        } else {
          next.past = [...past, { redo: r.applied, undo: r.undo }].slice(-HISTORY_LIMIT);
        }
        next.future = [];
        last = coalesce ? { key: coalesce, at: now } : null;
      }
      set(next);
      if (!remote) listener?.(r.applied);
    },

    undo: () => {
      const { past, future } = get();
      const entry = past[past.length - 1];
      if (!entry) return;
      const { page, items } = get();
      const r = applyOps({ page, items }, entry.undo);
      set({
        page: r.state.page,
        items: r.state.items,
        past: past.slice(0, -1),
        future: [entry, ...future],
        dirty: true,
        selectedId: null,
        group: [],
      });
      listener?.(r.applied);
    },

    redo: () => {
      const { past, future } = get();
      const entry = future[0];
      if (!entry) return;
      const { page, items } = get();
      const r = applyOps({ page, items }, entry.redo);
      set({
        page: r.state.page,
        items: r.state.items,
        past: [...past, entry],
        future: future.slice(1),
        dirty: true,
        selectedId: null,
        group: [],
      });
      listener?.(r.applied);
    },

    select: (selectedId) => set({ selectedId, group: [] }),
    selectGroup: (ids) => {
      const { items } = get();
      const live = ids.filter((id) => items.some((i) => i.id === id));
      const only = items.find((i) => i.id === live[0]);
      // a single thing that can take handles is just "selected"; a pen stroke has none, so it stays a group
      if (live.length === 0) set({ selectedId: null, group: [] });
      else if (live.length === 1 && only && only.t !== "p")
        set({ selectedId: live[0]!, group: [] });
      else set({ selectedId: null, group: live });
    },
    setClip: (items) => set({ clip: { items, pastes: 0 } }),
    countPaste: () => {
      const clip = get().clip;
      if (!clip) return 0;
      const pastes = clip.pastes + 1;
      set({ clip: { ...clip, pastes } });
      return pastes;
    },
    setTool: (tool) =>
      set({
        tool,
        selectedId: tool === "select" ? get().selectedId : null,
        group: tool === "select" ? get().group : [],
      }),
    setPen: (patch) => set({ pen: { ...get().pen, ...patch } }),
    setText: (patch) => set({ text: { ...get().text, ...patch } }),
    markSaved: () => set({ dirty: false }),
    bind: (l) => {
      listener = l;
    },
  }));
}

const Ctx = createContext<JournalStore | null>(null);

/** One store per open journal, so closing it forgets its history. */
export function JournalStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createJournalStore);
  return createElement(Ctx.Provider, { value: store }, children);
}

export function useJournalStore(): JournalStore {
  const store = useContext(Ctx);
  if (!store)
    throw new Error("useJournalStore must be used inside <JournalStoreProvider>");
  return store;
}

export function useJournalState<T>(selector: (s: JournalState) => T): T {
  return useStore(useJournalStore(), selector);
}
