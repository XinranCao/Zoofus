PatternEditor is where users design a print. One editor serves tape prints and sticker-edge fills, and its output is a `PatternSpec`.

**Anatomy.**
- **Pattern**: a ToggleGroup of Solid, Stripes, Dots, Gingham, Check, Wave, Pixels and Doodle.
- **Paper** and **Ink**: ColorPickers with the 16 user colours, 8 per row. Ink is hidden for Solid.
- **Size** (6–28px), **Turn** (0–180°) and **Weight** (10–90%): sliders, shown as each kind needs them.
- **Pixels**: an 8 × 8 PixelGrid (tap cells to fill them, plus Clear) with a live repeat preview.
- **Doodle**: a 144px DoodlePad. Draw with a finger or mouse in a 48-unit tile. It has Undo and Clear, and a live repeat preview.

**Props.** `value` (initial PatternSpec), `onChange(spec)`, `label` ("Print", "Edge fill"), `kinds` (limit the list), `seed`.

**Accessibility.** The pattern kinds are a radiogroup. Pixel cells are `aria-pressed` buttons named by row and column. The doodle pad is optional: presets and pixels cover keyboard-only users.
