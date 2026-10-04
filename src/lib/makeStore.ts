import { create } from "zustand";

/** What the Make menu can start. */
export type MakeKey = "sticker" | "tape" | "journal" | "together";

interface MakeState {
  open: MakeKey | null;
  show: (key: MakeKey) => void;
  close: () => void;
}

/** Which "make" dialog is open. The Make menu opens it over whatever page you are on. */
export const useMake = create<MakeState>((set) => ({
  open: null,
  show: (open) => set({ open }),
  close: () => set({ open: null }),
}));
