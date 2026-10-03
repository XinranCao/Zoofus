Button is a flat torn paper button: primary (brick), secondary (mustard), quiet (text plus a hand-drawn underline on hover) and danger (plum).

**Anatomy.** The `<button>` is the wrapper (`.zf-torn`: rotation, fibre lip, focus trace). The face span holds an optional 18px icon and a `label`.

**Sizes.** `sm` 36px min height, 8/14 padding, 14px. `md` 44px, 12/22, 15px. `lg` 52px, 15/28, 17px. Touch targets are never under 44px on mobile.

**Colours.** Primary is `accent` with `on-accent` (5.15:1). Secondary is `accent-2` with `ink-deep` (6.39:1). Danger is `plum-900` with `on-accent` (9.77:1). Quiet uses `ink`, with no face and no lip.

**States.** No shadows, ever.
- Default: seeded ±0.8°.
- Hover: 0°, −1px, face `brightness(.95)`. Quiet shows the Scribble underline.
- Active: 0°, +1px, scale .985, `brightness(.9)`.
- Focus-visible: the sheet halo plus plum ring traced around the tear and lip. Quiet gains a sheet face.
- Disabled: `sage-100` face, cocoa at 62%, no rotation, `aria-disabled`.
- Loading: typing dots after the verb, `aria-busy`.

**Rules.** One primary per view. Labels are verbs in sentence case.
