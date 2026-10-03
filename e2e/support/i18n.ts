import { en } from "../../src/i18n/locales/en";
import { zh } from "../../src/i18n/locales/zh";

export type Lang = "en" | "zh";

const catalogs = { en, zh } as const;

const lookup = (lang: Lang, key: string): string => {
  let node: unknown = catalogs[lang];
  for (const part of key.split("."))
    node = (node as Record<string, unknown> | undefined)?.[part];
  if (typeof node !== "string") throw new Error(`Missing ${lang} string: ${key}`);
  return node;
};

/** `t("auth.login.submit")` in the locale under test, with `{{name}}` filled in. */
export function makeT(lang: Lang) {
  const t = (key: string, vars: Record<string, string | number> = {}) =>
    lookup(lang, key).replace(/\{\{(\w+)\}\}/g, (_, v: string) => String(vars[v] ?? ""));
  /** The string as a RegExp with any `{{var}}` matching anything, anchored at the start. */
  const rx = (key: string) =>
    new RegExp(
      "^" +
        lookup(lang, key)
          .split(/\{\{\w+\}\}/)
          .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join(".*"),
    );
  return { t, rx };
}
