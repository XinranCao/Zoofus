/**
 * The fonts a journal's text can use. Handwriting and Chinese hand fonts are fetched only when
 * chosen (their stylesheets come split by unicode-range, so only the glyphs used are downloaded).
 */
export interface JournalFont {
  key: string;
  /** The CSS font-family stack. */
  family: string;
  group: "type" | "hand" | "cjk" | "plain";
  load?: () => Promise<unknown>;
}

const sys = (stack: string) => stack;

export const FONTS: JournalFont[] = [
  {
    key: "typewriter",
    family: '"Special Elite", "Xiaolai Mono SC", serif',
    group: "type",
  },
  {
    key: "courier",
    family: '"Courier Prime", "Xiaolai Mono SC", monospace',
    group: "type",
  },
  {
    key: "caveat",
    family: 'Caveat, "Ma Shan Zheng", cursive',
    group: "hand",
    load: () => import("@fontsource/caveat/500.css"),
  },
  {
    key: "patrick",
    family: '"Patrick Hand", "Ma Shan Zheng", cursive',
    group: "hand",
    load: () => import("@fontsource/patrick-hand/400.css"),
  },
  {
    key: "indie",
    family: '"Indie Flower", "Ma Shan Zheng", cursive',
    group: "hand",
    load: () => import("@fontsource/indie-flower/400.css"),
  },
  {
    key: "mashan",
    family: '"Ma Shan Zheng", cursive',
    group: "cjk",
    load: () => import("@fontsource/ma-shan-zheng/400.css"),
  },
  {
    key: "kuaile",
    family: '"ZCOOL KuaiLe", cursive',
    group: "cjk",
    load: () => import("@fontsource/zcool-kuaile/400.css"),
  },
  {
    key: "longcang",
    family: '"Long Cang", cursive',
    group: "cjk",
    load: () => import("@fontsource/long-cang/400.css"),
  },
  {
    key: "wenkai",
    family: '"LXGW WenKai", "Xiaolai Mono SC", serif',
    group: "cjk",
    load: () => import("@fontsource/lxgw-wenkai/500.css"),
  },
  {
    key: "serif",
    family: sys('Georgia, "Songti SC", "Noto Serif SC", serif'),
    group: "plain",
  },
  {
    key: "sans",
    family: sys('system-ui, "PingFang SC", "Noto Sans SC", sans-serif'),
    group: "plain",
  },
];

export const DEFAULT_FONT = "caveat";

export const fontOf = (key: string): JournalFont =>
  FONTS.find((f) => f.key === key) ?? FONTS.find((f) => f.key === DEFAULT_FONT)!;

const loaded = new Map<string, Promise<void>>();

/** Make sure a font is on the page and ready to draw with. Resolves even if it fails (a fallback is used). */
export function ensureFont(key: string, sample = "Aa字"): Promise<void> {
  const font = fontOf(key);
  let p = loaded.get(font.key);
  if (!p) {
    p = (async () => {
      try {
        await font.load?.();
        await document.fonts.load(`24px ${font.family}`, sample);
      } catch {
        /* the fallback in the stack is used */
      }
    })();
    loaded.set(font.key, p);
  }
  return p;
}
