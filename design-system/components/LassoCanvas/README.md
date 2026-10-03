LassoCanvas is the photo well in the sticker maker: the photo, the outside dimmed and a marching-ants selection.

**Anatomy.** A Paper well (`md` tear, `field`, no rotation, 12px padding) holding a 4:3 stage holding an SVG overlay over the canvas.

**States.**
- Empty: the dashed hand-drawn drop zone and "Choose a photo".
- Loading: the tape reel on sage.
- Select: loden/sheet ants, dash 6 6.
- Deselect: plum/sheet ants, dash 3 5.
- Shape: the same ants on the shape outline.
- Closed: the outside is dimmed with loden at 38% (even-odd).

**Ants.** A 5px loden halo at 28%, a 2px sheet base and 2px dark dashes marching −12 per 600ms. They freeze under reduced motion.

**Input.** Pointer events with `touch-action: none`. The first point shows as a ring, and snapping within 12px closes the loop. Keyboard users get shape tools plus arrow-key nudging of the selected shape.
