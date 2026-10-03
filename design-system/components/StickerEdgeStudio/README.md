StickerEdgeStudio is the sticker edge editor, used as step 2 of the sticker maker and from "Edit edge" in the sticker book.

**Anatomy.** The left side is a notebook-ground stage with the sticker at 0°, re-rendered live through `dieCut`. The right side holds:
- **Edge shape**: Smooth, Wobbly or Torn.
- **Edge width**: a slider of 0–160% of the automatic width, shown in px, where 0 means none.
- **Edge fill**: a PatternEditor (colour or pattern).
- Save to book and Download PNG (hidden when the maker dialog supplies its own footer).

**Output.** `edge: { shape, scale, fill: PatternSpec }`, stored with the sticker so it can be re-edited. The exported PNG matches the preview exactly.

**Performance.** Re-render at most once per frame while a slider moves. A torn edge costs 20–40ms at preview size.
