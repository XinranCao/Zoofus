Dialog is a flat modal sheet torn from a magazine, taped over a loden scrim.

**Anatomy.** A scrim (`loden-900` at 32%, flat), then a Paper (`lg` tear with lip, `scrap`, `rot-text`, two tapes at opposite top corners). The face has 28/28/24 padding and holds a close button, an optional kicker, the title (`h1`), the body and the actions (right-aligned, danger on the far left).

**Sizes.** 420 (form), 560 (detail), 1040 (maker). Under 760px the maker becomes a full-bleed sheet at 0°.

**Behaviour.** Radix Dialog: focus trap, Esc, `aria-labelledby`, focus returned to the trigger. Motion: opacity, plus 8px up, plus rotation settling (`dur-slow`, `ease-flop`). No shadow.
