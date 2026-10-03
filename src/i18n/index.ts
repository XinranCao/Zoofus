import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { ensureCjkFonts } from "@/lib/cjkFonts";
import { en } from "./locales/en";
import { zh } from "./locales/zh";

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "zh-CN", label: "中文" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

/** `<html lang>` follows the active locale (and `:lang(zh)` raises the line height). */
function syncHtmlLang(lng: string) {
  if (typeof document !== "undefined")
    document.documentElement.lang = lng.startsWith("zh") ? "zh-CN" : "en";
  if (lng.startsWith("zh")) ensureCjkFonts(); // the Chinese interface needs them; English does not
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, "zh-CN": { translation: zh } },
    fallbackLng: "en",
    supportedLngs: ["en", "zh-CN", "zh"],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "zoofus.lang",
    },
  })
  .then(() => syncHtmlLang(i18n.language));

i18n.on("languageChanged", syncHtmlLang);

export default i18n;
