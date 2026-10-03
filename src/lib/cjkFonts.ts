/**
 * The Chinese fonts (Xiaolai Mono SC, with LXGW WenKai as the fallback) ship as about 620 small
 * `unicode-range` slices. Their stylesheet alone is ~60 KB gzipped, so it is fetched only when
 * Chinese is actually on screen: the Chinese interface, or Chinese text a person wrote (a
 * sticker name, a nickname). English pages never download it. The few Han characters the English
 * interface itself uses ("中文", "昵称") come from a 1.7 KB subset in `styles/fonts.css`.
 */
let started = false;

export function ensureCjkFonts() {
  if (started) return;
  started = true;
  void import("cn-fontsource-xiaolai-mono-sc-regular/font.css");
  void import("@fontsource/lxgw-wenkai/500.css");
}

const HAN = /[㐀-鿿＀-￯]/;

/** Call with text that is about to be shown: loads the Chinese fonts if it has any Han in it. */
export function ensureFontsFor(text: string | undefined | null) {
  if (text && HAN.test(text)) ensureCjkFonts();
}
