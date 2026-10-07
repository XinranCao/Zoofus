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

/** Every string in a locale. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

/** ASCII punctuation touching Chinese: a Chinese sentence uses full-width marks (，？！：；（）). */
const ASCII_NEXT_TO_CHINESE = /[\u3400-\u9fff] ?[,?!:;()]|[,?!:;()] ?[\u3400-\u9fff]/;
export const hasAsciiPunctuation = (text: string) => ASCII_NEXT_TO_CHINESE.test(text);

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

  it("the Chinese strings use full-width punctuation", () => {
    expect(strings(zh).filter(hasAsciiPunctuation)).toEqual([]);
  });

  it("the punctuation check catches a deliberately wrong string, and leaves numbers and English alone", () => {
    expect(hasAsciiPunctuation("先剪一张,再存起来")).toBe(true);
    expect(hasAsciiPunctuation("确认一下邮箱吧(可不填)")).toBe(true);
    expect(hasAsciiPunctuation("先剪一张，再存起来")).toBe(false);
    expect(hasAsciiPunctuation("好友码 ABCD-2345 · 9:30")).toBe(false);
    expect(hasAsciiPunctuation("Log in, then Continue")).toBe(false);
  });

  it("one word for one idea (the terms the interface settled on)", () => {
    const banned = [
      "资料库",
      "胶带库",
      "拷贝",
      "样东西",
      "置顶",
      "置底",
      "纹样",
      "名称",
      "朋友",
    ];
    const found = strings(zh).filter((text) => banned.some((w) => text.includes(w)));
    expect(found).toEqual([]);
    const english = strings(en).filter((text) => /\bchosen\b|\bManage\b/.test(text));
    expect(english).toEqual([]);
  });
});
