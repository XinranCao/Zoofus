/**
 * The fonts a journal's text can use. Handwriting and Chinese hand fonts are fetched only when
 * chosen (their stylesheets come split by unicode-range, so only the glyphs used are downloaded).
 */
export interface JournalFont {
  key: string;
  /** The CSS font-family stack. */
  family: string;
  /** Which heading it is listed under. */
  group: "type" | "hand" | "cjkhand" | "plain";
  load?: () => Promise<unknown>;
}

const CJK_HAND = '"Ma Shan Zheng", cursive';

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
    key: "serif",
    family: 'Georgia, "Songti SC", "Noto Serif SC", serif',
    group: "plain",
  },
  {
    key: "sans",
    family: 'system-ui, "PingFang SC", "Noto Sans SC", sans-serif',
    group: "plain",
  },
  {
    key: "wenkai",
    family: '"LXGW WenKai", "Xiaolai Mono SC", serif',
    group: "cjkhand",
    load: () => import("lxgw-wenkai-webfont/lxgwwenkai-regular.css"),
  },
  {
    key: "mashan",
    family: CJK_HAND,
    group: "cjkhand",
    load: () => import("@fontsource/ma-shan-zheng/400.css"),
  },
  {
    key: "kuaile",
    family: '"ZCOOL KuaiLe", cursive',
    group: "cjkhand",
    load: () => import("@fontsource/zcool-kuaile/400.css"),
  },
  {
    key: "longcang",
    family: '"Long Cang", cursive',
    group: "cjkhand",
    load: () => import("@fontsource/long-cang/400.css"),
  },
  {
    key: "liujian",
    family: '"Liu Jian Mao Cao", cursive',
    group: "cjkhand",
    load: () => import("@fontsource/liu-jian-mao-cao/400.css"),
  },
  {
    key: "zhimang",
    family: '"Zhi Mang Xing", cursive',
    group: "cjkhand",
    load: () => import("@fontsource/zhi-mang-xing/400.css"),
  },
  {
    key: "xiaowei",
    family: '"ZCOOL XiaoWei", serif',
    group: "cjkhand",
    load: () => import("@fontsource/zcool-xiaowei/400.css"),
  },
  {
    key: "huangyou",
    family: '"ZCOOL QingKe HuangYou", sans-serif',
    group: "cjkhand",
    load: () => import("@fontsource/zcool-qingke-huangyou/400.css"),
  },
  {
    key: "caveat",
    family: `Caveat, ${CJK_HAND}`,
    group: "hand",
    load: () => import("@fontsource/caveat/500.css"),
  },
  {
    key: "patrick",
    family: `"Patrick Hand", ${CJK_HAND}`,
    group: "hand",
    load: () => import("@fontsource/patrick-hand/400.css"),
  },
  {
    key: "indie",
    family: `"Indie Flower", ${CJK_HAND}`,
    group: "hand",
    load: () => import("@fontsource/indie-flower/400.css"),
  },
  {
    key: "shadows",
    family: `"Shadows Into Light", ${CJK_HAND}`,
    group: "hand",
    load: () => import("@fontsource/shadows-into-light/400.css"),
  },
  {
    key: "kalam",
    family: `Kalam, ${CJK_HAND}`,
    group: "hand",
    load: () => import("@fontsource/kalam/400.css"),
  },
  {
    key: "gaegu",
    family: `Gaegu, ${CJK_HAND}`,
    group: "hand",
    load: () => import("@fontsource/gaegu/400.css"),
  },
  {
    key: "dancing",
    family: `"Dancing Script", ${CJK_HAND}`,
    group: "hand",
    load: () => import("@fontsource/dancing-script/500.css"),
  },
  {
    key: "marker",
    family: `"Permanent Marker", ${CJK_HAND}`,
    group: "hand",
    load: () => import("@fontsource/permanent-marker/400.css"),
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
