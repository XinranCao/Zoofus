StudioPreview is the preview column of a studio (tape, sticker edge, pattern).

**Behaviour.** On a phone (under 760px and at least 560px tall) the preview stays pinned at the top of the dialog's one scrolling part while the options below scroll, and the scroller gets a scroll padding as tall as the preview, so a control focused or scrolled into view is never hidden behind it. On a short phone (landscape) the preview scrolls with everything else.

**Rules.** Dialogs never grow past the screen; there is one scrolling part (`.zf-dialog__scroll`).
