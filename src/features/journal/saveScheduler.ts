/**
 * When to write what someone is editing. A plain debounce waits for a pause, so steady editing
 * would write nothing until it stops (and a crash would lose it all); this one also has a
 * maximum wait counted from the first unsaved change, and an optional minimum gap between writes
 * (for the page picture, which is an upload).
 */
export interface Scheduler {
  /** Something changed: make sure a write is on its way. */
  touch: () => void;
  /** Drop what is waiting (the page is closing and writes what is left itself). */
  cancel: () => void;
}

export function createScheduler(opts: {
  /** A write follows this long after the last change... */
  delay: number;
  /** ...but never later than this after the first unsaved change. */
  maxWait: number;
  /** Writes are at least this far apart (0: no limit). */
  minGap?: number;
  run: () => void;
  now?: () => number;
}): Scheduler {
  const now = opts.now ?? Date.now;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let first: number | null = null;
  let lastRun = -Infinity;
  const fire = () => {
    timer = null;
    first = null;
    lastRun = now();
    opts.run();
  };
  return {
    touch() {
      const t = now();
      if (first === null) first = t;
      const byPause = opts.delay;
      const byMax = Math.max(0, first + opts.maxWait - t);
      const gap = Math.max(0, lastRun + (opts.minGap ?? 0) - t);
      if (timer) clearTimeout(timer);
      timer = setTimeout(fire, Math.max(Math.min(byPause, byMax), gap));
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
      first = null;
    },
  };
}
