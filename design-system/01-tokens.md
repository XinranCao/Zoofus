# Tokens & Tailwind

The tokens live in `tokens.json`, which feeds the Colors, Typography and Spacing views. There is **no shadow family**: Zoofus is flat. Below is the same set written as a Tailwind v4 `@theme` block, ready to paste into `src/styles/theme.css`. The palette keeps the owner's 23 colours exactly. Each one is named after its hue plus a 50–900 lightness step, so a name tells you how dark the colour is. One tone is added: `sheet-50` #fbf6ee, a warm off-white for the die-cut sticker border and for text on brick and plum. The brief bans pure white, and stickers need a white cut border.

## Semantic roles (use these, not the palette names)

| Role | Value | Use |
| --- | --- | --- |
| `ground` | kraft-100 | Page background, under the dot grid |
| `scrap` / `scrap-warm` / `scrap-cool` / `scrap-pink` | cream / peach / celery / blush | Surfaces. Alternate them between neighbours |
| `field` | sheet-50 | Inputs, canvas well |
| `ink` | cocoa-800 | All body text |
| `ink-deep` | loden-900 | Headings, wordmark, text on lime / mustard / pink |
| `ink-muted` | moss-700 | Hints and meta, on light scraps only |
| `accent` + `on-accent` | brick + sheet | The one primary action per view |
| `accent-2` | mustard | Secondary action |
| `selected` | lime | Chip / toggle / menu item on-state |
| `focus`, `danger` | plum | Focus ring, destructive fill, error text |
| `danger-mark` | raspberry | Error wavy underline and icon (always with plum text) |
| `fiber` | sheet-50 | The pale lip along every torn edge (cream-100 on sheet faces) |
| Tape & sticker-edge prints | any of the 16 user colours | Designed by users with `PatternEditor`, see Signature elements §3 and §8 |

## Contrast pairs (WCAG 2.1, checked)

The brief's three named checks map to these rows: ink on scrap is `ink` on `scrap` (6.40), scrap on brick is `cream-100` on `accent` (4.53), and scrap on navy is `cream-100` on `plum-900` (8.58). The palette has no navy, so plum stands in for it; see Open questions.

| Text | Ground | Ratio | Result |
| --- | --- | --- | --- |
| `ink` #6c4a3b | `ground` #e8ddd0 | 5.85:1 | AA |
| `ink` #6c4a3b | `scrap` #f1e9bf | 6.40:1 | AA |
| `ink` #6c4a3b | `scrap-warm` #ffe4c5 | 6.40:1 | AA |
| `ink` #6c4a3b | `scrap-cool` #ecefbc | 6.58:1 | AA |
| `ink` #6c4a3b | `scrap-pink` #f4ddea | 6.11:1 | AA |
| `ink` #6c4a3b | `field` #fbf6ee | 7.28:1 | AA |
| `ink` #6c4a3b | `accent-2` #edcd7e | 5.09:1 | AA |
| `ink` #6c4a3b | `pink-200` #efb6d5 | 4.60:1 | AA |
| `ink-deep` #41470e | `scrap` #f1e9bf | 8.04:1 | AA |
| `ink-deep` #41470e | `selected` #dce35d | 7.12:1 | AA |
| `ink-deep` #41470e | `accent-2` #edcd7e | 6.39:1 | AA |
| `ink-deep` #41470e | `pink-200` #efb6d5 | 5.78:1 | AA |
| `ink-deep` #41470e | `olive-500` #b4bc2f | 4.77:1 | AA |
| `ink-muted` #57620d | `ground` #e8ddd0 | 4.97:1 | AA |
| `ink-muted` #57620d | `scrap` #f1e9bf | 5.43:1 | AA |
| `ink-muted` #57620d | `field` #fbf6ee | 6.18:1 | AA |
| `ink-muted` #57620d | `scrap-pink` #f4ddea | 5.19:1 | AA |
| `ink-muted` #57620d | `accent-2` #edcd7e | 4.32:1 | AA large / UI 3:1 |
| `on-accent` #fbf6ee | `accent` #bc3b22 | 5.15:1 | AA |
| `cream-100` #f1e9bf | `accent` #bc3b22 | 4.53:1 | AA |
| `on-accent` #fbf6ee | `plum-900` #7a0e4d | 9.77:1 | AA |
| `cream-100` #f1e9bf | `plum-900` #7a0e4d | 8.58:1 | AA |
| `danger` #7a0e4d | `scrap-pink` #f4ddea | 8.20:1 | AA |
| `danger` #7a0e4d | `scrap` #f1e9bf | 8.58:1 | AA |
| `raspberry-600` #c32768 | `field` #fbf6ee | 5.12:1 | AA |
| `raspberry-600` #c32768 | `ground` #e8ddd0 | 4.12:1 | AA large / UI 3:1 |
| `success` #57620d | `scrap-cool` #ecefbc | 5.59:1 | AA |
| `sheet-50` #fbf6ee | `loden-900` #41470e | 9.15:1 | AA |
| `focus` #7a0e4d | `ground` #e8ddd0 | 7.85:1 | AA |
| `focus` #7a0e4d | `scrap` #f1e9bf | 8.58:1 | AA |
| `focus` #7a0e4d | `accent-2` #edcd7e | 6.83:1 | AA |
| `magenta-500` #da3b84 | `scrap` #f1e9bf | 3.47:1 | AA large / UI 3:1 |

Rules that follow from the table:

- Put brick button labels in `on-accent` (5.15), not cream (4.53, which only just passes).
- `raspberry-600` is never text on `ground`. Error text is `danger` (plum), and raspberry only marks the error (wavy line, icon).
- `ink-muted` never sits on `accent-2`, `pink-200` or darker.
- `magenta-500`, `rose-400`, `hotpink-300`, `orange-500`, `tangerine-400`, `apricot-300` and `chartreuse-400` never carry text.

## Tailwind v4 `@theme`

```css
@import "tailwindcss";
@theme {
  /* palette + roles */
  --color-kraft-100: #e8ddd0;
  --color-peach-100: #ffe4c5;
  --color-apricot-300: #f1a17a;
  --color-tangerine-400: #e57c48;
  --color-orange-500: #ea6422;
  --color-sage-100: #e3e5d0;
  --color-celery-200: #ecefbc;
  --color-lime-300: #dce35d;
  --color-chartreuse-400: #e3ed2a;
  --color-olive-500: #b4bc2f;
  --color-moss-700: #57620d;
  --color-mustard-300: #edcd7e;
  --color-cream-100: #f1e9bf;
  --color-blush-100: #f4ddea;
  --color-pink-200: #efb6d5;
  --color-hotpink-300: #f779be;
  --color-rose-400: #e374a7;
  --color-magenta-500: #da3b84;
  --color-brick-600: #bc3b22;
  --color-raspberry-600: #c32768;
  --color-cocoa-800: #6c4a3b;
  --color-loden-900: #41470e;
  --color-plum-900: #7a0e4d;
  --color-sheet-50: #fbf6ee;
  --color-ground: var(--color-kraft-100);
  --color-scrap: var(--color-cream-100);
  --color-scrap-warm: var(--color-peach-100);
  --color-scrap-cool: var(--color-celery-200);
  --color-scrap-pink: var(--color-blush-100);
  --color-field: var(--color-sheet-50);
  --color-ink: var(--color-cocoa-800);
  --color-ink-deep: var(--color-loden-900);
  --color-ink-muted: var(--color-moss-700);
  --color-accent: var(--color-brick-600);
  --color-on-accent: var(--color-sheet-50);
  --color-accent-2: var(--color-mustard-300);
  --color-selected: var(--color-lime-300);
  --color-focus: var(--color-plum-900);
  --color-danger: var(--color-plum-900);
  --color-danger-mark: var(--color-raspberry-600);
  --color-success: var(--color-moss-700);
  --color-ants-a: var(--color-sheet-50);
  --color-ants-b: var(--color-loden-900);
  --color-ants-deselect: var(--color-plum-900);
  --color-doodle: var(--color-cocoa-800);
  --color-fiber: var(--color-sheet-50);
  --color-dot: #6c4a3b26;
  --color-grain: #6c4a3b14;

  /* type */
  --font-display: "Special Elite", "Xiaolai Mono SC", "LXGW WenKai", "Noto Serif SC", serif;
  --font-body: "Courier Prime", "Xiaolai Mono SC", "LXGW WenKai", "Noto Serif SC", ui-monospace, monospace;
  --text-wordmark: 34px;  --text-wordmark--line-height: 1;  --text-wordmark--letter-spacing: -0.01em;
  --text-display: 44px;  --text-display--line-height: 1.05;
  --text-h1: 30px;  --text-h1--line-height: 1.15;
  --text-h2: 22px;  --text-h2--line-height: 1.2;
  --text-label: 15px;  --text-label--line-height: 1.2;  --text-label--letter-spacing: 0.02em;
  --text-kicker: 12px;  --text-kicker--line-height: 1.3;  --text-kicker--letter-spacing: 0.12em;
  --text-body: 16px;  --text-body--line-height: 1.55;
  --text-body-sm: 14px;  --text-body-sm--line-height: 1.5;
  --text-body-strong: 16px;  --text-body-strong--line-height: 1.55;
  --text-caption: 12px;  --text-caption--line-height: 1.4;

  /* spacing: Tailwind multiplies --spacing; 4px base keeps p-4 = 16px */
  --spacing: 4px;

  /* radius: torn shapes, so only these */
  --radius-none: 0;
  --radius-photo: 2px;

  /* no shadows: flat paper. Reset Tailwind's scale so nobody reaches for it */
  --shadow-*: initial;
  --drop-shadow-*: initial;
  --inset-shadow-*: initial;

  /* motion */
  --ease-paper: cubic-bezier(0.3, 0.7, 0.4, 1);
  --ease-flop: cubic-bezier(0.34, 1.4, 0.64, 1);
  --animate-march: march 600ms linear infinite;
  @keyframes march { to { stroke-dashoffset: -12; } }
}

:root {
  /* non-Tailwind design variables */
  --tear-xs: 2.6px;
  --tear-sm: 3.6px;
  --tear-md: 5.5px;
  --tear-lg: 7.5px;
  --tear-xl: 10px;
  --rot-text: 0.4deg;
  --rot-control: 0.8deg;
  --rot-card: 1.5deg;
  --rot-sticker: 4deg;
  --rot-tape: 8deg;
  --pattern-scale-min: 6px;
  --pattern-scale-default: 12px;
  --pattern-scale-max: 28px;
  --pixel-grid: 8;
  --doodle-tile: 48;
  --tape-opacity-default: 0.82;
  --dur-quick: 120ms; --dur-base: 200ms; --dur-slow: 320ms;
}

@media (prefers-reduced-motion: reduce) {
  :root { --dur-quick: 0ms; --dur-base: 0ms; --dur-slow: 0ms; }
}
```

Fonts, self-hosted:

```ts
// main.tsx
import "@fontsource/special-elite/400.css";
import "@fontsource/courier-prime/400.css";
import "@fontsource/courier-prime/700.css";
import "cn-fontsource-xiaolai-mono-sc-regular/font.css"; // 小赖字体 等宽 SC, split by unicode-range
import "@fontsource/lxgw-wenkai/500.css";               // fallback for any glyph Xiaolai lacks (the package has no 400)
```

Both CJK packages ship unicode-range slices, so a Latin-only page downloads no CJK bytes, and a Chinese page downloads only the slices it uses. The family name the installed `cn-fontsource` CSS declares is exactly `"Xiaolai Mono SC"` (verified).

### Chinese pairing

| Role | Latin | Chinese | Why |
| --- | --- | --- | --- |
| Display, labels, buttons | Special Elite | **Xiaolai Mono SC** 小赖字体 等宽 | Worn, slightly uneven strokes. Mono widths keep the typewriter rhythm |
| Body | Courier Prime | **Xiaolai Mono SC** | Same face: a typewriter has one typeface. Courier and Xiaolai are both monospaced |
| Alt display | Special Elite | LXGW Marker Gothic 霞鹜漫黑 | If Xiaolai feels too soft for headings: chunkier, felt-marker |
| Calm fallback | — | LXGW WenKai 霞鹜文楷 | For long Chinese text if Xiaolai is too playful |

Rejected: Xiangcui Typewriter (香萃打字机体) has too much ink-bleed and is too formal (owner's call). Noto Serif SC and other Song faces are too formal for the brand.

## Type scale

| Style | Size / line | Face | Use |
| --- | --- | --- | --- |
| `wordmark` | 34 / 1 (26 mobile) | Special Elite | The wordmark only |
| `display` | 44 / 1.05 (32 mobile) | Special Elite | Page title |
| `h1` | 30 / 1.15 | Special Elite | Dialog, section title |
| `h2` | 22 / 1.2 | Special Elite | Card, panel heading |
| `label` | 15 / 1.2, +0.02em | Special Elite | Buttons, labels, chips, menu |
| `kicker` | 12 / 1.3, +0.12em, UPPER | Special Elite | "No. 02 · Sticker book" |
| `body` | 16 / 1.55 | Courier Prime | Default |
| `body-sm` | 14 / 1.5 | Courier Prime | Hints, toasts |
| `body-strong` | 16 / 1.55 bold | Courier Prime | Emphasis |
| `caption` | 12 / 1.4 | Courier Prime | Sticker metadata |

For Chinese, keep the same sizes and set `:lang(zh)` line-height to 1.75 with +0.02em tracking. Special Elite labels in Chinese fall through to Xiaolai Mono SC, which looks right at the same size.

## Rotation & jitter

| Token | Range | Applies to | Hover / active |
| --- | --- | --- | --- |
| `rot-text` | ±0.4° | inputs, dialogs, text panels | none |
| `rot-control` | ±0.8° | buttons, chips, toasts | hover → 0°, −1px, face brightness .95. Active → 0°, +1px, scale .985, brightness .9 |
| `rot-card` | ±1.5° | cards, tiles, empty states | static (cards are not buttons) |
| `rot-sticker` | ±4° | stickers in grid / collage | hover → 0°, −2px, scale 1.02 |
| `rot-tape` | ±8° off the edge it crosses | tape | none |

The angle is `seededRot(seed, range)`, so it is deterministic per element id and doesn't change between renders. Disabled controls are never rotated.

## Motion

`dur-quick` 120ms is for press and colour. `dur-base` 200ms is for hover settle. `dur-slow` 320ms is for dialog and toast. `ease-paper` is the default curve and `ease-flop` (a small overshoot) is for a sticker landing and a dialog opening. Dialogs come in with opacity 0→1, translateY 8px→0 and rotate (r+1°)→r. Toasts slide 12px from the bottom. Under `prefers-reduced-motion` every duration is 0, the ants freeze and the typing loader shows its static dots.
