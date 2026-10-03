StickerTile is one sticker in the book grid: the sticker, its name and the date, with rename and delete actions.

**Anatomy.** A figure holding the sticker area (size + 34px, optional tape), the name (`label`, `ink-deep`) and the meta (`caption`, `ink-muted`). Rename and Delete are quiet small buttons shown on hover or focus-within, or from a long-press menu on touch.

**Rename.** The caption swaps for a TextField. Enter saves and Esc cancels.

**Delete.** A confirmation Dialog, then an "Undo" toast.

**Activation.** Opens the detail Dialog, which has "Edit edge", "Rename" and "Download PNG".
