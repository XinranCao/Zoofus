TextField is a labelled input on a torn sheet-white field with a hand-drawn underline.

**Anatomy.** A label (`label`, `ink-deep`), then the box (`.zf-torn`, ±0.4°, lip in `cream-100`, focus trace), then the face (`sm` tear, `field`) holding the input (Courier Prime 16px, 46px min) and a Scribble 6px from the bottom. A hint or error sits beneath (`body-sm`).

**States.**
- Default: underline at 55% doodle.
- Focus: traced plum ring, and the underline becomes plum.
- Error: `scrap-pink` face, raspberry wave underline, a plum message with an icon, `aria-invalid`.
- Disabled: sage face, 65% opacity.

**Rules.** 16px text stops iOS zooming. The placeholder is never the label. Bilingual labels use a middle dot ("Nickname · 昵称").
