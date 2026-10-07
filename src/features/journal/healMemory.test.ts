import { beforeEach, describe, expect, it } from "vitest";
import { recentlyFailed, rememberFailure } from "./healMemory";

beforeEach(() => localStorage.clear());

describe("remembering a failed heal", () => {
  it("skips a journal for a day, then tries again", () => {
    const t = 1_000_000;
    expect(recentlyFailed("a", t)).toBe(false);
    rememberFailure("a", t);
    expect(recentlyFailed("a", t + 60_000)).toBe(true);
    expect(recentlyFailed("a", t + 24 * 3600_000 + 1)).toBe(false);
    expect(recentlyFailed("b", t + 60_000)).toBe(false);
  });

  it("survives unreadable storage", () => {
    localStorage.setItem("zf-heal-failed", "{nope");
    expect(recentlyFailed("a")).toBe(false);
    rememberFailure("a");
    expect(recentlyFailed("a")).toBe(true);
  });
});
