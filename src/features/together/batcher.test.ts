import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBatcher } from "./batcher";

describe("createBatcher", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const make = () => {
    const write = vi.fn(async () => {});
    const writePage = vi.fn(async () => {});
    const onError = vi.fn();
    return {
      write,
      writePage,
      onError,
      b: createBatcher<number, string>(write, writePage, onError, 250),
    };
  };

  it("writes only the latest state of an object, once per burst", () => {
    const { b, write } = make();
    for (let i = 1; i <= 60; i++) b.put("a", i);
    expect(write).not.toHaveBeenCalled();
    vi.advanceTimersByTime(250);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith("a", 60);
  });

  it("keeps writing while changes continue, at most once per interval", () => {
    const { b, write } = make();
    for (let t = 0; t < 1000; t += 16) {
      b.put("a", t);
      vi.advanceTimersByTime(16);
    }
    expect(write.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(write.mock.calls.length).toBeLessThanOrEqual(5);
  });

  it("keeps different objects and removals apart, and the paper", () => {
    const { b, write, writePage } = make();
    b.put("a", 1);
    b.put("b", 2);
    b.put("a", null);
    b.page("lined");
    vi.advanceTimersByTime(250);
    expect(write).toHaveBeenCalledWith("a", null);
    expect(write).toHaveBeenCalledWith("b", 2);
    expect(write).toHaveBeenCalledTimes(2);
    expect(writePage).toHaveBeenCalledWith("lined");
  });

  it("knows what is still waiting, and writes it when flushed or stopped", () => {
    const { b, write } = make();
    b.put("a", 1);
    expect(b.has("a")).toBe(true);
    expect(b.has("z")).toBe(false);
    b.stop();
    expect(write).toHaveBeenCalledWith("a", 1);
    expect(b.has("a")).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("reports a failed write without losing the others", async () => {
    const { b, write, onError } = make();
    write.mockRejectedValueOnce(new Error("no"));
    b.put("a", 1);
    b.put("b", 2);
    vi.advanceTimersByTime(250);
    await Promise.resolve();
    await Promise.resolve();
    expect(write).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
