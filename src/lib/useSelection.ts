import { useCallback, useMemo, useState } from "react";

/**
 * Bulk selection for a gallery. `active` turns the grid into a picking mode; `ids` is what is
 * picked. `prune` drops ids that no longer exist (something was deleted).
 */
export function useSelection() {
  const [active, setActive] = useState(false);
  const [ids, setIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const set = useCallback((all: string[]) => setIds(new Set(all)), []);
  const clear = useCallback(() => setIds(new Set()), []);
  const start = useCallback(() => setActive(true), []);
  const stop = useCallback(() => {
    setActive(false);
    setIds(new Set());
  }, []);

  return useMemo(
    () => ({ active, ids, count: ids.size, start, stop, toggle, set, clear }),
    [active, ids, start, stop, toggle, set, clear],
  );
}

export type Selection = ReturnType<typeof useSelection>;
