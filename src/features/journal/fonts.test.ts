import { beforeEach, describe, expect, it, vi } from "vitest";

const load = vi.fn(() => Promise.resolve([]));
beforeEach(() => {
  load.mockClear();
  Object.defineProperty(document, "fonts", { value: { load }, configurable: true });
});

describe("ensureFont", () => {
  it("loads the Chinese handwriting fallback when Chinese is written in a Latin handwriting font", async () => {
    const { ensureFont } = await import("./fonts");
    await ensureFont("caveat", "你好 hi");
    const asked = load.mock.calls.map((c) => String((c as unknown[])[0]));
    expect(asked.some((f) => f.includes("Ma Shan Zheng"))).toBe(true);
    expect(asked.some((f) => f.includes("Caveat"))).toBe(true);
  });

  it("loads Xiaolai behind the typewriter font", async () => {
    const { ensureFont } = await import("./fonts");
    await ensureFont("typewriter", "你好");
    const asked = load.mock.calls.map((c) => String((c as unknown[])[0]));
    expect(asked.some((f) => f.includes("Xiaolai Mono SC"))).toBe(true);
  });

  it("asks for nothing extra for English text", async () => {
    const { ensureFont } = await import("./fonts");
    load.mockClear();
    await ensureFont("kalam", "Hello");
    const asked = load.mock.calls.map((c) => String((c as unknown[])[0]));
    expect(asked.some((f) => f.includes("Ma Shan Zheng") && !f.includes("Kalam"))).toBe(
      false,
    );
  });

  it("a new text starts in a Chinese handwriting font when the interface is in Chinese", async () => {
    const { defaultTextFont, DEFAULT_FONT, fontOf } = await import("./fonts");
    expect(defaultTextFont("zh-CN")).toBe("wenkai");
    expect(fontOf(defaultTextFont("zh-CN")).key).toBe("wenkai");
    expect(defaultTextFont("en")).toBe(DEFAULT_FONT);
    expect(defaultTextFont(undefined)).toBe(DEFAULT_FONT);
  });
});
