/**
 * A quiet safety net: a journal is kept at most this often while you edit (the timer is not pushed
 * back by every change). Save is always one click away.
 */
export const AUTOSAVE_MS = 60_000;
