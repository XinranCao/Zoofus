ToggleGroup is a single-select row of Chips, used for the sticker maker's Mode (Select / Deselect) and Shape (Freehand, Triangle, Rectangle, Star).

**Behaviour.** Build it on Radix ToggleGroup `type="single"`: `role="radiogroup"`, arrow keys move between options, and one tab stop. Each option has an icon plus a label. On mobile it wraps across rows and never scrolls horizontally.

**Props.** `label` (the accessible group name), `options` ({value, label, icon}), `value`, `onChange`.
