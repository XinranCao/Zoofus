ColorPicker is a radiogroup of torn swatches, used for the sticker edge colour and the pattern paper and ink colours.

**Anatomy.** 28–32px Swatches (`.zf-torn`, `xs` tear, seeded ±3°). The selected one is set straight, gets the traced ring and a loden check. The popover variant is a flat `scrap` Paper (Radix Popover).

**Colour sets.** UI border presets: sheet, cream, blush, celery, mustard, kraft. User design colours (16): sheet, cream, peach, blush, pink, celery, lime, mustard, apricot, rose, olive, tangerine, brick, plum, moss, cocoa. Every swatch has an accessible name.

**Props.** `value`, `colors` (token names or [token, label] pairs), `columns`, `popover`, `label`, `onChange`.

**On a phone** (under 760px) the picker is folded into `ColorDropdown`: a torn chip showing the colour as a dot and its name, which opens the swatches in a small `scrap` (four to a row at a 48px pitch) and closes when one is chosen. A tall single column of swatches is never used.
