Scribble is a seeded hand-drawn line for input underlines, the current-page underline, quiet-button hover and dashed dividers (`Divider`).

**Anatomy.** An SVG with `viewBox 0 0 200 8`, `preserveAspectRatio="none"` and one quadratic path with `vector-effect: non-scaling-stroke`, drawn in `currentColor`.

**Variants.** `line` (default), `wave` (error) and `dashed` (dash pattern 7 5 3 6 9 5). The weight is 1.6px, or 2px for nav and focus.

**Colour.** Use `doodle` at 55% at rest, `plum-900` on focus and `raspberry-600` on error.

**Note.** When absolutely positioned, give it an explicit `width: calc(100% - Npx)`, because left/right do not stretch an SVG.
