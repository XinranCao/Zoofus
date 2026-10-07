import { describe, expect, it } from "vitest";
import {
  AWAY_DAYS,
  daysSince,
  ideaIndex,
  isAway,
  isNewAccount,
  newest,
  nextFeature,
  pathSteps,
  relativeParts,
  timeBand,
} from "./homeData";

const at = (h: number, m = 0) => new Date(2026, 9, 6, h, m);

describe("time of day", () => {
  it.each([
    [4, 59, "night"],
    [5, 0, "morning"],
    [11, 59, "morning"],
    [12, 0, "afternoon"],
    [17, 59, "afternoon"],
    [18, 0, "evening"],
    [21, 59, "evening"],
    [22, 0, "night"],
    [0, 0, "night"],
  ] as const)("%i:%i is %s", (h, m, band) => {
    expect(timeBand(at(h, m))).toBe(band);
  });
});

describe("which layout", () => {
  it("is the new-account one only when nothing has been made", () => {
    expect(isNewAccount({ stickers: 0, journals: 0, tapes: 0 })).toBe(true);
    expect(isNewAccount({ stickers: 1, journals: 0, tapes: 0 })).toBe(false);
    expect(isNewAccount({ stickers: 0, journals: 1, tapes: 0 })).toBe(false);
    expect(isNewAccount({ stickers: 0, journals: 0, tapes: 3 })).toBe(false);
  });
});

describe("away", () => {
  const now = new Date(2026, 9, 20, 12);
  it("needs the newest activity to be 14 days old or more", () => {
    expect(isAway(new Date(2026, 9, 7, 12), now)).toBe(false); // 13 days
    expect(isAway(new Date(2026, 9, 6, 12), now)).toBe(true); // 14 days
    expect(AWAY_DAYS).toBe(14);
    expect(isAway(null, now)).toBe(false); // nothing made: a new account, not an absence
  });
  it("counts whole days", () => {
    expect(daysSince(new Date(2026, 9, 18, 13), now)).toBe(1);
  });
  it("takes the newest of several dates and ignores missing ones", () => {
    const a = new Date(2026, 1, 1);
    const b = new Date(2026, 5, 1);
    expect(newest([a, undefined, b])).toEqual(b);
    expect(newest([undefined])).toBeNull();
  });
});

describe("what to try", () => {
  it("suggests the first feature not used yet", () => {
    const all = { journal: true, tape: true, friend: true, collection: true };
    expect(nextFeature({ ...all, journal: false })).toBe("journal");
    expect(nextFeature({ ...all, tape: false, friend: false })).toBe("tape");
    expect(nextFeature(all)).toBeNull();
  });
  it("marks each of the four things done once it exists, and the first undone one as the start", () => {
    expect(pathSteps({ stickers: 0, tapes: 0, journals: 0, friends: 0 })).toEqual([
      { done: false, start: true },
      { done: false, start: false },
      { done: false, start: false },
      { done: false, start: false },
    ]);
    const s = pathSteps({ stickers: 2, tapes: 0, journals: 1, friends: 0 });
    expect(s.map((x) => x.done)).toEqual([true, false, true, false]);
    expect(s.map((x) => x.start)).toEqual([false, true, false, false]);
  });
});

describe("the idea of the day", () => {
  it("follows the day of the year, and Another idea moves on by one", () => {
    const a = ideaIndex(new Date(2026, 0, 1), 0, 30);
    expect(ideaIndex(new Date(2026, 0, 2), 0, 30)).toBe((a + 1) % 30);
    expect(ideaIndex(new Date(2026, 0, 1), 1, 30)).toBe((a + 1) % 30);
    expect(ideaIndex(new Date(2026, 0, 1), 0, 0)).toBe(0);
  });
});

describe("how long ago", () => {
  const now = new Date(2026, 9, 20, 12);
  it("reads in days, then weeks, months and years", () => {
    expect(relativeParts(new Date(2026, 9, 20, 9), now)).toEqual({
      value: -0,
      unit: "day",
    });
    expect(relativeParts(new Date(2026, 9, 19, 9), now)).toEqual({
      value: -1,
      unit: "day",
    });
    expect(relativeParts(new Date(2026, 8, 15, 12), now)).toEqual({
      value: -5,
      unit: "week",
    });
    expect(relativeParts(new Date(2026, 4, 1, 12), now)).toEqual({
      value: -5,
      unit: "month",
    });
    expect(relativeParts(new Date(2024, 9, 1), now)).toEqual({ value: -2, unit: "year" });
  });
});
