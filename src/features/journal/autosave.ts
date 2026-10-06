/** What you place or change on a journal is written this long after your last edit. */
export const ITEMS_SAVE_MS = 2_000;

/**
 * The page picture (a thumbnail upload) is kept at most this often while you edit (the timer is
 * not pushed back by every change), and when you leave. Save is always one click away.
 */
export const AUTOSAVE_MS = 60_000;
