import { describe, expect, it } from "vitest";
import {
  CODE_ALPHABET,
  formatCode,
  isCode,
  makeFriendCode,
  normalizeCode,
} from "./friendCode";

describe("friend codes", () => {
  it("are 8 characters from the readable alphabet", () => {
    for (let i = 0; i < 200; i++) {
      const c = makeFriendCode();
      expect(c).toHaveLength(8);
      expect(isCode(c)).toBe(true);
      for (const ch of c) expect(CODE_ALPHABET).toContain(ch);
    }
  });
  it("are not all the same", () => {
    expect(
      new Set(Array.from({ length: 50 }, () => makeFriendCode())).size,
    ).toBeGreaterThan(45);
  });
  it("are accepted however they were typed", () => {
    expect(normalizeCode("abcd-2345")).toBe("ABCD2345");
    expect(normalizeCode(" ABCD 2345 ")).toBe("ABCD2345");
  });
  it("are refused when wrong", () => {
    expect(normalizeCode("ABCD234")).toBeNull();
    expect(normalizeCode("ABCD23456")).toBeNull();
    expect(normalizeCode("ABCD-23O5")).toBeNull(); // O is not in the alphabet
    expect(normalizeCode("<script>")).toBeNull();
    expect(normalizeCode("")).toBeNull();
  });
  it("are shown in two halves", () => {
    expect(formatCode("ABCD2345")).toBe("ABCD-2345");
  });
});
