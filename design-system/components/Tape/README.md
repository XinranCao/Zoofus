Tape is a strip of washi or masking tape that the **user can turn, size, print and finish**. UI tape uses the same component with presets.

**Props.** `pattern` (a PatternSpec: solid, stripes, dots, gingham, check, wave, pixels, doodle), `angle` (−90…90°, seeded ±8° if omitted), `length` (40–220px), `thickness` (12–36px), `opacity` (0.5–1, 0.82 by default), `ends` (`torn` | `cut` | `pinked`), `x`/`y` (centre, within the parent), `seed`. Presets: `color="tape-mustard" | "tape-celery" | "tape-pink" | "tape-apricot" | "tape-gingham"`.

**Render.** An absolutely positioned span at `translate(-50%,-50%) rotate(angle)` with multiply blend, clipped by its end shape and filled with an inline SVG pattern. It is decorative (`aria-hidden`), and flat, with no shadow.

**UI rules.** One or two pieces per element and about six per viewport. Never on buttons, chips, inputs or menus. On user pages there are no limits.
