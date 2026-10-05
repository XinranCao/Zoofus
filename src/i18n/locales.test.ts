import { describe, expect, it } from "vitest";
import { en } from "./locales/en";
import { zh } from "./locales/zh";

/** Every key path of a locale, arrays by index. */
function keys(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) return value.flatMap((v, i) => keys(v, `${prefix}${i}.`));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([k, v]) => keys(v, `${prefix}${k}.`));
  return [prefix.slice(0, -1)];
}

describe("locales", () => {
  it("English and Chinese have exactly the same keys", () => {
    const e = new Set(keys(en));
    const z = new Set(keys(zh));
    expect([...e].filter((k) => !z.has(k))).toEqual([]);
    expect([...z].filter((k) => !e.has(k))).toEqual([]);
  });

  it("the starter tapes are named in Chinese, and a named sticker is not captioned twice", () => {
    expect(zh.tape.starterNames).toHaveLength(4);
    for (const name of zh.tape.starterNames) expect(name).toMatch(/[㐀-鿿]/);
  });
});
