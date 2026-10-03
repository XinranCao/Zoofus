import { f1 } from "./random";

/**
 * Pattern engine, shared by tape prints and sticker-edge fills (both user-designed).
 * One spec, three renderers: inline SVG for the UI, an SVG image for canvas (patternSVG),
 * and the same markup for thumbnails in "My tape roll".
 */

export const PALETTE = {
  "kraft-100": "#e8ddd0",
  "peach-100": "#ffe4c5",
  "apricot-300": "#f1a17a",
  "tangerine-400": "#e57c48",
  "orange-500": "#ea6422",
  "sage-100": "#e3e5d0",
  "celery-200": "#ecefbc",
  "lime-300": "#dce35d",
  "chartreuse-400": "#e3ed2a",
  "olive-500": "#b4bc2f",
  "moss-700": "#57620d",
  "mustard-300": "#edcd7e",
  "cream-100": "#f1e9bf",
  "blush-100": "#f4ddea",
  "pink-200": "#efb6d5",
  "hotpink-300": "#f779be",
  "rose-400": "#e374a7",
  "magenta-500": "#da3b84",
  "brick-600": "#bc3b22",
  "raspberry-600": "#c32768",
  "cocoa-800": "#6c4a3b",
  "loden-900": "#41470e",
  "plum-900": "#7a0e4d",
  "sheet-50": "#fbf6ee",
} as const;

export type PaletteName = keyof typeof PALETTE;

/** The 16 colours users may print with. The near-fluorescent tones are deliberately left out. */
export const USER_COLORS = [
  "sheet-50",
  "cream-100",
  "peach-100",
  "blush-100",
  "pink-200",
  "celery-200",
  "lime-300",
  "mustard-300",
  "apricot-300",
  "rose-400",
  "olive-500",
  "tangerine-400",
  "brick-600",
  "plum-900",
  "moss-700",
  "cocoa-800",
] as const satisfies readonly PaletteName[];

export type PatternKind =
  "solid" | "stripes" | "dots" | "gingham" | "check" | "wave" | "pixels" | "doodle";

export const PATTERN_KINDS: readonly PatternKind[] = [
  "solid",
  "stripes",
  "dots",
  "gingham",
  "check",
  "wave",
  "pixels",
  "doodle",
];

export interface PatternSpec {
  kind: PatternKind;
  /** Paper colour, one of the palette names. */
  bg: PaletteName;
  /** Print colour. */
  ink?: PaletteName;
  /** 6-28px repeat. */
  scale?: number;
  /** 0-180° pattern rotation. */
  angle?: number;
  /** 0.1-0.9 stripe width / dot size / line weight. */
  weight?: number;
  /** 8 rows of 8 "0"/"1" characters (pixels kind): one cell = scale ÷ 4. */
  pixels?: string[];
  /** SVG path data in a 48 × 48 tile (doodle kind), repeated at 4 × scale. */
  strokes?: string[];
}

export function hex(c: string): string {
  return (PALETTE as Record<string, string>)[c] ?? c;
}

let pid = 0;

/** Inner SVG markup (defs + two rects). `k` scales the pattern (e.g. devicePixelRatio). */
export function patternMarkup(spec: PatternSpec, k = 1, id?: string): string {
  const pattern = id ?? "zp" + ++pid;
  const s = (spec.scale ?? 12) * k;
  const w = spec.weight ?? 0.5;
  const ink = hex(spec.ink ?? "cocoa-800");
  const bg = hex(spec.bg ?? "mustard-300");
  const a = spec.angle ?? 0;
  let tile = "";
  let tw = s;
  let th = s;
  switch (spec.kind) {
    case "stripes":
      tile = `<rect width="${f1(s * w)}" height="${s}" fill="${ink}"/>`;
      break;
    case "dots": {
      const r = f1(s * (0.12 + w * 0.3));
      tile = [
        [0, 0],
        [s, 0],
        [0, s],
        [s, s],
        [s / 2, s / 2],
      ]
        .map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${ink}"/>`)
        .join("");
      break;
    }
    case "gingham": {
      const g = f1(s * (0.2 + w * 0.5));
      tile =
        `<rect width="${g}" height="${s}" fill="${ink}" fill-opacity=".5"/>` +
        `<rect width="${s}" height="${g}" fill="${ink}" fill-opacity=".5"/>`;
      break;
    }
    case "check":
      tile =
        `<rect width="${s / 2}" height="${s / 2}" fill="${ink}"/>` +
        `<rect x="${s / 2}" y="${s / 2}" width="${s / 2}" height="${s / 2}" fill="${ink}"/>`;
      break;
    case "wave":
      tw = s * 2;
      tile =
        `<path d="M0 ${s / 2} Q${s / 2} 0 ${s} ${s / 2} T${2 * s} ${s / 2}" fill="none" stroke="${ink}" ` +
        `stroke-width="${f1(Math.max(1, s * (0.08 + w * 0.3)))}" stroke-linecap="round"/>`;
      break;
    case "pixels": {
      const rows = spec.pixels ?? [];
      const c = s / 4;
      tw = th = c * 8;
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          if (row[x] === "1") {
            tile += `<rect x="${f1(x * c)}" y="${f1(y * c)}" width="${f1(c + 0.3)}" height="${f1(c + 0.3)}" fill="${ink}"/>`;
          }
        }
      });
      break;
    }
    case "doodle": {
      tw = th = s * 4;
      const sc = tw / 48;
      tile =
        `<g transform="scale(${f1(sc * 100) / 100})" fill="none" stroke="${ink}" ` +
        `stroke-width="${f1(1.2 + w * 3)}" stroke-linecap="round" stroke-linejoin="round">` +
        (spec.strokes ?? []).map((d) => `<path d="${d}"/>`).join("") +
        "</g>";
      break;
    }
    default:
      tile = "";
  }
  const defs = tile
    ? `<defs><pattern id="${pattern}" patternUnits="userSpaceOnUse" width="${f1(tw)}" height="${f1(th)}" patternTransform="rotate(${a})">${tile}</pattern></defs>`
    : "";
  return (
    defs +
    `<rect width="100%" height="100%" fill="${bg}"/>` +
    (tile ? `<rect width="100%" height="100%" fill="url(#${pattern})"/>` : "")
  );
}

/** A standalone SVG document of `spec` at w × h, for use as a canvas image. */
export function patternSVG(spec: PatternSpec, w: number, h: number, k = 1): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${patternMarkup(spec, k, "p")}</svg>`;
}

export const BLANK_PIXELS = [
  "00000000",
  "00000000",
  "00000000",
  "00000000",
  "00000000",
  "00000000",
  "00000000",
  "00000000",
];
export const HEART_PIXELS = [
  "00000000",
  "01100110",
  "11111111",
  "11111111",
  "01111110",
  "00111100",
  "00011000",
  "00000000",
];
export const DOODLE_STROKES = [
  "M8 30 C14 18 22 18 26 28 S38 38 42 24",
  "M10 10 l4 4 M14 10 l-4 4",
  "M34 40 a3 3 0 1 0 0.1 0",
];

/** UI tape presets (solid masking, stripe, dots, apricot, gingham). */
export const TAPE_PRESETS: Record<string, PatternSpec> = {
  "tape-mustard": { kind: "solid", bg: "mustard-300" },
  "tape-celery": {
    kind: "stripes",
    bg: "lime-300",
    ink: "sheet-50",
    scale: 10,
    angle: 90,
    weight: 0.3,
  },
  "tape-pink": { kind: "dots", bg: "pink-200", ink: "sheet-50", scale: 9, weight: 0.35 },
  "tape-apricot": { kind: "solid", bg: "apricot-300" },
  "tape-gingham": {
    kind: "gingham",
    bg: "cream-100",
    ink: "olive-500",
    scale: 10,
    weight: 0.4,
  },
};
