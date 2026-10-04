import { MAX_JOURNAL_ITEMS, type Item, type PageSpec } from "./journal.schema";

/**
 * Every change to a journal page is a list of small operations. A solo journal applies them to its
 * list and records the inverse for undo; a shared workspace sends the same operations to the others.
 * One vocabulary for both is what makes working together possible without two editors.
 */
export type Op =
  { k: "put"; item: Item } | { k: "del"; id: string } | { k: "page"; page: PageSpec };

export interface PageState {
  page: PageSpec;
  items: Item[];
}

const byZ = (a: Item, b: Item) => a.z - b.z;

/**
 * Applies `ops` and returns the new state plus the operations that undo them. An op that cannot
 * apply (deleting what is not there, adding past the limit) is skipped and has no inverse.
 */
export function applyOps(
  state: PageState,
  ops: Op[],
): { state: PageState; undo: Op[]; applied: Op[] } {
  let items = state.items;
  let page = state.page;
  const undo: Op[] = [];
  const applied: Op[] = [];
  for (const op of ops) {
    if (op.k === "put") {
      const at = items.findIndex((i) => i.id === op.item.id);
      if (at === -1) {
        if (items.length >= MAX_JOURNAL_ITEMS) continue;
        items = [...items, op.item].sort(byZ);
        undo.unshift({ k: "del", id: op.item.id });
      } else {
        undo.unshift({ k: "put", item: items[at]! });
        items = items.map((i, n) => (n === at ? op.item : i)).sort(byZ);
      }
      applied.push(op);
    } else if (op.k === "del") {
      const at = items.findIndex((i) => i.id === op.id);
      if (at === -1) continue;
      undo.unshift({ k: "put", item: items[at]! });
      items = items.filter((i) => i.id !== op.id);
      applied.push(op);
    } else {
      undo.unshift({ k: "page", page });
      page = op.page;
      applied.push(op);
    }
  }
  return { state: { page, items }, undo, applied };
}

export const topZ = (items: Item[]) => items.reduce((m, i) => Math.max(m, i.z), -1) + 1;
export const bottomZ = (items: Item[]) => items.reduce((m, i) => Math.min(m, i.z), 0) - 1;

/**
 * Moves an item in the stack: to the front or the back, or one place up or down (past the
 * neighbour above or below it). Nothing to do if it is already there.
 */
export function reorder(
  items: Item[],
  id: string,
  where: "front" | "back" | "up" | "down",
): Op[] {
  const item = items.find((i) => i.id === id);
  if (!item) return [];
  const others = items.filter((i) => i.id !== id);
  if (others.length === 0) return [];
  if (where === "up" || where === "down") {
    const sorted = [...items].sort((a, b) => a.z - b.z || a.id.localeCompare(b.id));
    const at = sorted.findIndex((i) => i.id === id);
    const next = sorted[where === "up" ? at + 1 : at - 1];
    if (!next) return [];
    // swap places with the neighbour; if they share a level, nudge past it
    if (next.z === item.z)
      return [
        {
          k: "put",
          item: { ...item, z: item.z + (where === "up" ? 1 : -1) },
        },
      ];
    return [
      { k: "put", item: { ...item, z: next.z } },
      { k: "put", item: { ...next, z: item.z } },
    ];
  }
  if (where === "front") {
    if (others.every((i) => i.z <= item.z)) return [];
    return [{ k: "put", item: { ...item, z: topZ(others) } }];
  }
  if (others.every((i) => i.z >= item.z)) return [];
  return [{ k: "put", item: { ...item, z: bottomZ(others) } }];
}
