import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createScheduler } from "./saveScheduler";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("the save scheduler", () => {
  it("writes once, a delay after the last change", () => {
    const run = vi.fn();
    const s = createScheduler({ delay: 2000, maxWait: 15000, run });
    s.touch();
    vi.advanceTimersByTime(1500);
    s.touch();
    vi.advanceTimersByTime(1900);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("writes by the maximum wait when edits never pause (one every 1.5 s for 45 s)", () => {
    const run = vi.fn();
    const s = createScheduler({ delay: 2000, maxWait: 15000, run });
    const starts: number[] = [];
    run.mockImplementation(() => starts.push(Date.now()));
    const t0 = Date.now();
    for (let at = 0; at <= 45_000; at += 1500) {
      s.touch();
      vi.advanceTimersByTime(1500);
    }
    // a write at or before 15 s after the first change, and the next 15 s after that
    expect(starts.length).toBeGreaterThanOrEqual(3);
    expect(starts[0]! - t0).toBeLessThanOrEqual(15_000);
    expect(starts[1]! - starts[0]!).toBeLessThanOrEqual(15_000 + 1500);
  });

  it("starts counting again after a write", () => {
    const run = vi.fn();
    const s = createScheduler({ delay: 2000, maxWait: 15000, run });
    s.touch();
    vi.advanceTimersByTime(2000);
    expect(run).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    s.touch();
    vi.advanceTimersByTime(1999);
    expect(run).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("keeps writes a minimum gap apart", () => {
    const run = vi.fn();
    const s = createScheduler({ delay: 8000, maxWait: 30000, minGap: 20000, run });
    s.touch();
    vi.advanceTimersByTime(8000);
    expect(run).toHaveBeenCalledTimes(1);
    s.touch(); // right after a write: not before 20 s have passed since it
    vi.advanceTimersByTime(19_900);
    expect(run).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(200);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("does nothing after cancel", () => {
    const run = vi.fn();
    const s = createScheduler({ delay: 2000, maxWait: 15000, run });
    s.touch();
    s.cancel();
    vi.advanceTimersByTime(60_000);
    expect(run).not.toHaveBeenCalled();
  });
});
