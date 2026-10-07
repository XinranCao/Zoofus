/**
 * What the home page decides from data the app already has: the time of day, which of the five
 * layouts to show, how long it has been, which feature to suggest next, and the idea of the day.
 * Pure functions, so each rule is tested.
 */

export type Band = "morning" | "afternoon" | "evening" | "night";

/** 05:00-11:59 morning, 12:00-17:59 afternoon, 18:00-21:59 evening, 22:00-04:59 night. */
export function timeBand(date: Date): Band {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  if (h >= 18 && h < 22) return "evening";
  return "night";
}

export interface HomeCounts {
  stickers: number;
  journals: number;
  tapes: number;
}

/** A person who has made nothing yet sees the new-account layout; anyone else the returning one. */
export const isNewAccount = (c: HomeCounts) =>
  c.stickers === 0 && c.journals === 0 && c.tapes === 0;

const DAY = 24 * 60 * 60 * 1000;
/** After this many days without activity the greeting changes. */
export const AWAY_DAYS = 14;

export const newest = (dates: (Date | undefined)[]): Date | null => {
  const live = dates.filter((d): d is Date => d instanceof Date && !Number.isNaN(+d));
  return live.length ? new Date(Math.max(...live.map(Number))) : null;
};

export const daysSince = (then: Date, now: Date) => Math.floor((+now - +then) / DAY);

/** Away: the newest thing the person made or changed is 14 days old or more. */
export const isAway = (last: Date | null, now: Date) =>
  last !== null && daysSince(last, now) >= AWAY_DAYS;

export type Feature = "journal" | "tape" | "friend" | "collection";
export interface Used {
  journal: boolean;
  tape: boolean;
  friend: boolean;
  collection: boolean;
}
const ORDER: Feature[] = ["journal", "tape", "friend", "collection"];

/** The first feature not used yet, or null once all are. */
export const nextFeature = (used: Used): Feature | null =>
  ORDER.find((f) => !used[f]) ?? null;

/**
 * "Four things to try": each is done once its thing exists, and the first one not done is where
 * to start.
 */
export function pathSteps(c: HomeCounts & { friends: number }) {
  const done = [c.stickers > 0, c.tapes > 0, c.journals > 0, c.friends > 0];
  const start = done.indexOf(false);
  return done.map((d, i) => ({ done: d, start: i === start }));
}

/** The day of the year, 1 to 366, on the device's calendar. */
export const dayOfYear = (date: Date) =>
  Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(date.getFullYear(), 0, 0)) /
      DAY,
  );

/** The idea shown today; "Another idea" adds one more to `offset`. Never the same twice in a row. */
export const ideaIndex = (date: Date, offset: number, count: number) =>
  count <= 0 ? 0 : (dayOfYear(date) + offset) % count;

/**
 * How long ago, as a number and a unit for `Intl.RelativeTimeFormat`: days up to a week, then
 * weeks (up to 8), then months, then years. Today and yesterday read as words ("numeric: auto").
 */
export function relativeParts(
  then: Date,
  now: Date,
): { value: number; unit: "day" | "week" | "month" | "year" } {
  const days = Math.max(0, daysSince(then, now));
  if (days < 7) return { value: -days, unit: "day" };
  if (days < 60) return { value: -Math.floor(days / 7), unit: "week" };
  if (days < 365) return { value: -Math.floor(days / 30), unit: "month" };
  return { value: -Math.floor(days / 365), unit: "year" };
}
