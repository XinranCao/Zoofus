/** What you place or change on a journal is written this long after your last edit. */
export const ITEMS_SAVE_MS = 2_000;

/**
 * The page picture (a thumbnail upload) is kept at most this often while you edit (the timer is
 * not pushed back by every change), and when you leave. Save is always one click away.
 */
export const AUTOSAVE_MS = 60_000;

/** The page picture is made this long after the last edit... */
export const PICTURE_AFTER_MS = 8_000;
/** ...and never more often than this. */
export const PICTURE_EVERY_MS = 20_000;

/**
 * ...and a write is never later than this after the first change that is not saved yet, however
 * steadily someone edits (a crash or a closed laptop then loses at most this much).
 */
export const ITEMS_MAX_WAIT_MS = 15_000;
export const PICTURE_MAX_WAIT_MS = 30_000;
