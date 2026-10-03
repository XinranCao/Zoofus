Sticker is a die-cut sticker: the user's cut-out with a **user-chosen edge** (shape, width, colour or pattern) baked in. It is flat, with no shadow.

**Pipeline.** Source (a transparent cut-out) → `dieCut(src, { shape, border, color, fill, fiber, seed })` → canvas, which is displayed and exported as is. See Signature elements §4 and §8.

**Props.** `src` (or `art` in demos), `size` (display max side), `edge: { shape: 'smooth' | 'wobbly' | 'torn', scale: 0–1.6, fill: PatternSpec }`, `seed`, `rotate` (±range, 0 for detail views), `label` (alt text = the sticker's name). Legacy `borderColor` and `borderScale` still work.

**Defaults.** Wobbly, scale 1 (`clamp(4, 4.5% of max side, 28)` px), solid `sheet-50`.

**States.** Hover: 0°, −2px, scale 1.02. Focus (when interactive): traced ring. Dragging (collage): scale 1.04.
