import { describe, expect, it, vi } from "vitest";
import { inviteEach } from "./invites";

describe("inviteEach", () => {
  it("keeps going after a failure and says which ones failed", async () => {
    const one = vi.fn(async (uid: string) => {
      if (uid === "b") throw new Error("denied");
    });
    const r = await inviteEach(["a", "b", "c"], one);
    expect(r).toEqual({ invited: ["a", "c"], failed: ["b"] });
    expect(one).toHaveBeenCalledTimes(3);
  });

  it("a retry with the failed ones touches only those", async () => {
    let calls: string[] = [];
    let broken = true;
    const one = async (uid: string) => {
      calls.push(uid);
      if (broken && uid === "b") throw new Error("denied");
    };
    const first = await inviteEach(["a", "b", "c"], one);
    calls = [];
    broken = false;
    const retry = await inviteEach(first.failed, one);
    expect(calls).toEqual(["b"]);
    expect(retry).toEqual({ invited: ["b"], failed: [] });
  });
});
