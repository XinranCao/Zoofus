/**
 * Gathers the changes made on a shared page and writes them in bursts. Dragging a sticker changes
 * it dozens of times a second, but only where it ends up matters to everyone else, so for each
 * object only the latest state is written, at most once per `ms` (plus a final write when the
 * changes stop). Each write costs money and bandwidth; this cuts a drag from ~60 writes a second
 * to ~4 without anyone noticing, since people see each other's moves in quarter-second steps.
 */
export interface Batcher<T, P> {
  /** Remember the latest state of an object (`null` means it was removed). */
  put: (id: string, value: T | null) => void;
  /** Remember the latest paper. */
  page: (page: P) => void;
  /** Is there a change for this object that has not been written yet? */
  has: (id: string) => boolean;
  /** Write everything waiting now (leaving the page, or pressing Save). */
  flush: () => void;
  /** Forget the timer (the component is gone); anything waiting is written first. */
  stop: () => void;
}

export function createBatcher<T, P>(
  write: (id: string, value: T | null) => Promise<void>,
  writePage: (page: P) => Promise<void>,
  onError: (err: unknown) => void,
  ms = 250,
): Batcher<T, P> {
  const waiting = new Map<string, T | null>();
  let paper: { page: P } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    const items = [...waiting];
    waiting.clear();
    const page = paper;
    paper = null;
    for (const [id, value] of items) write(id, value).catch(onError);
    if (page) writePage(page.page).catch(onError);
  };
  const arm = () => {
    if (!timer) timer = setTimeout(flush, ms);
  };
  return {
    put: (id, value) => {
      waiting.set(id, value);
      arm();
    },
    page: (page) => {
      paper = { page };
      arm();
    },
    has: (id) => waiting.has(id),
    flush,
    stop: flush,
  };
}
