import { useSyncExternalStore } from "react";

let detail: string | null = null;
const listeners = new Set<() => void>();

/** A page that has steps names the step here (`null` clears it); the shell puts it in the title. */
export function setTitleDetail(next: string | null) {
  if (next === detail) return;
  detail = next;
  listeners.forEach((l) => l());
}

export function useTitleDetail(): string | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => detail,
    () => null,
  );
}
