import { describe, expect, it } from "vitest";
import { pngName } from "./export";

describe("pngName", () => {
  it("makes a safe lowercase file name", () => {
    expect(pngName("Pear from the market")).toBe("pear-from-the-market.png");
    expect(pngName("  Cut 3 Oct!  ")).toBe("cut-3-oct.png");
  });

  it("keeps Chinese characters", () => {
    expect(pngName("小梨 子")).toBe("小梨-子.png");
  });

  it("falls back when nothing usable is left", () => {
    expect(pngName("///")).toBe("zoofus-sticker.png");
  });
});
