import { MAX_PAGE_ITEMS, type PageItem } from "./page.schema";

/** Pure, immutable operations on a page's item list. */

const topZ = (items: PageItem[]) => items.reduce((max, i) => Math.max(max, i.z), -1);
const bottomZ = (items: PageItem[]) => items.reduce((min, i) => Math.min(min, i.z), 1);

/** Places a sticker on top of the stack. Returns the list unchanged when the page is full. */
export function addItem(
  items: PageItem[],
  stickerId: string,
  at: { x: number; y: number },
  id: string,
): PageItem[] {
  if (items.length >= MAX_PAGE_ITEMS) return items;
  return [
    ...items,
    { id, stickerId, x: at.x, y: at.y, scale: 1, rotation: 0, z: topZ(items) + 1 },
  ];
}

export function updateItem(
  items: PageItem[],
  id: string,
  patch: Partial<Omit<PageItem, "id" | "stickerId">>,
): PageItem[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export function removeItem(items: PageItem[], id: string): PageItem[] {
  return items.filter((item) => item.id !== id);
}

export function bringToFront(items: PageItem[], id: string): PageItem[] {
  return updateItem(items, id, { z: topZ(items) + 1 });
}

export function sendToBack(items: PageItem[], id: string): PageItem[] {
  return updateItem(items, id, { z: bottomZ(items) - 1 });
}

/** Items in drawing order (back to front). */
export function inDrawOrder(items: PageItem[]): PageItem[] {
  return [...items].sort((a, b) => a.z - b.z);
}

/** Drop items whose sticker no longer exists (e.g. it was deleted from the sticker book). */
export function pruneMissingStickers(
  items: PageItem[],
  stickerIds: Set<string>,
): PageItem[] {
  return items.filter((item) => stickerIds.has(item.stickerId));
}
