# Screens

Each screen has a live preview card (Components → Screens) showing a 390px and a 1280px frame side by side. Layouts switch at **760px** on the container, with mobile below it. Grids are loose on purpose. Content aligns to a 12-column, 1184px-max container (gutter `space-12` on desktop, `space-4` on mobile), and individual scraps tilt and overlap their column edges by a few pixels.

Popeye-style layout habits used throughout:

- A small numbered `kicker` above each section title ("NO. 01 · STICKER MAKER", "NO. 02 · STICKER BOOK").
- Big, confident `display` titles set flush-left, with generous space above sections (`space-12` desktop).
- One loose cluster of stickers as the only "image" on a page. There are no stock illustrations.

## Masthead

- **Desktop.** A full-width `peach-100` band, torn on the bottom edge only (`xl`, measured), padding 14 / 48 / 22. The wordmark sits left. On the right are the nav links (`label`, `ink`, with the current page in `ink-deep` plus a hand-drawn underline) and a 40px avatar that opens the AvatarMenu.
- **Signed out.** The same band, with a quiet "Log in" and a small primary "Sign up" button.
- **Mobile.** Padding 12 / 16 / 18 and a 26px wordmark. A menu button (44 × 44 touch target) replaces the nav and opens a torn `scrap` sheet from the top-right. The sheet holds the avatar and name, a divider, then Make a sticker / Sticker book / Profile / Log out, with the current item highlighted in `selected`. It is a Radix DropdownMenu at both sizes.
- The masthead is not sticky on mobile and sticky on desktop (`top: 0`). It stays flat: its torn bottom edge and lip are enough to separate it from the scrolling content.

## Auth (Log in, Sign up step 1–2, reset password)

- **Desktop.** Two columns centred in the page. The left column is a 420px loose collage of six example stickers (`rot-sticker`, decorative, `aria-hidden`). The right is a 440px `scrap` card (`lg` tear, `rot-text`, one washi tape top-centre) holding a kicker, an `h1` and the fields.
- **Mobile.** A strip of three small stickers, then the card full width. The card keeps a 0.4° tilt and 16px gutters.
- **Log in.** Fields are Email and Password. Actions are a primary "Log in" and a quiet "Forgot password?". Below a divider: "New here? Sign up".
- **Sign up 1.** Email and Password (hint "At least 8 characters."), then "Continue". The kicker reads "Sign up · step 1 of 2".
- **Sign up 2.** A 72px avatar frame (default: initial or person glyph on `pink-200`), a secondary "Add a photo" button with a hint, the Nickname / 昵称 field, then a primary "Start cutting" and a quiet "Back".
- **Reset password.** A Dialog over the auth page (420px) with Email and "Send link", then a success toast: "Check your inbox."
- **Error.** An error toast sits inside the card above the fields, and the field-level error goes on the offending field (blush ground, raspberry wave, plum message with icon). Focus moves to the first invalid field.
- **Loading.** The primary button shows "Logging in…" with typing dots, `aria-busy`, and the fields are disabled.

## Home

- **Desktop.** A hero row: a `scrap` card (lg, two tapes) with kicker "No. 01 · Sticker maker", `display` "Cut something out", one line of body and a large primary "Upload a photo" plus a quiet "How it works". Beside it sits a 2×2 cluster of 120px stickers. Below: "No. 02 · Sticker book", "Recently cut", a secondary "See all", and a 5-column row of StickerTiles.
- **Mobile.** The hero card goes full width without the cluster, and the recent row becomes a 2-column grid of 4.
- **New user.** The recent row is replaced by a small EmptyState ("Your stickers will land here"). Until the book ships, show the section with a mustard tape label "Soon", not a fake grid.
- **Drag-and-drop.** Dropping a photo anywhere on Home opens the Sticker maker with that photo.

## Sticker maker (dialog)

- **Desktop.** A Radix Dialog of 1040px max on a loden scrim, with an `lg` tear, `rot-text` and two tapes. Inside: kicker (step), `h1` title, and two columns. On the left is the canvas well (`md` tear, `field`, 4:3). On the right, a 240–360px tool column: Mode toggle (Select / Deselect), Shape toggle (Freehand, Triangle, Rectangle, Star), a divider, then quiet Undo / Redo / Delete / Reset. The footer is right-aligned: quiet "Cancel", primary "Cut it out" (disabled until a closed selection exists).
- **Mobile.** A full-bleed sheet from the top with 0° rotation and the canvas full width. Tools stack beneath as wrapping chip rows and the footer sits at the bottom. The canvas takes touch-drawing, so the sheet scrolls only via the tool area, and `touch-action: none` is set on the canvas.
- **Empty.** The canvas well shows a dashed hand-drawn drop zone, an upload icon, "Drop a photo here", the hint "PNG, JPG or HEIC, up to 20 MB" and a secondary "Choose a photo". The tools are present but disabled.
- **Loading.** A sage well with the tape-reel loader and "Opening photo…".
- **Error.** An error toast under the title ("We couldn't open that file") and the empty well, ready to try again.
- **Lasso.** Marching ants, as in Signature elements §7.
- **Result (step 2): the sticker edge studio.** The left side is the notebook ground with the die-cut sticker at 0°, re-rendering live. The right side has:
  - **Edge shape**: Smooth / Wobbly / Torn.
  - **Edge width**: a slider, 0 → none, shown in px.
  - **Edge fill**: a PatternEditor with Solid, Stripes, Dots, Gingham, Check, Wave, Pixels (8 × 8 stamp) and Doodle (draw a tile), plus paper and ink colours, size, turn and weight.

  The footer has a quiet "Back to editing", a secondary "Save to book" and a primary "Download PNG". On mobile the controls stack under the sticker and the footer stays at the bottom of the sheet. After saving, show the toast "Saved to your book."
- **Keyboard.** ⌘/Ctrl-Z undo, ⇧⌘Z redo, Delete removes the selected shape, Esc closes (with a confirmation if there is unsaved work), and Enter runs "Cut it out". Tooltips show the shortcuts.

## Sticker book

- **Desktop.** Kicker "No. 02 · 10 stickers", `display` "My sticker book" and a primary "New sticker" on the right. Below is a 5-column grid, 36px row gap, of StickerTiles: sticker (96px, `rot-sticker`), name in `label`, and "Cut 2 Oct" in `caption`. A few tiles carry tape.
- **Mobile.** A 2-column grid, with the button under the title.
- **Tile actions.** On hover or focus-within (and always visible on touch via a long-press menu), quiet "Rename" and "Delete" appear under the tile.
- **Rename.** The name turns into a TextField in place. Enter saves and Esc cancels.
- **Delete.** Opens a confirmation dialog ("Delete 'Pear'? This can't be undone.", danger "Delete"). After deleting, show the toast "Deleted" with an "Undo" action for 6s.
- **Detail.** A Dialog (560px) with kicker "Cut 2 Oct 2026 · 312 × 380 px", the name as `h1`, the sticker at 180px with 0° rotation, then danger "Delete" on the left and secondary "Rename", quiet "Edit edge" (opens the edge studio) and primary "Download PNG" on the right.
- **Empty.** A centred EmptyState (peach, washi tape) with a small star sticker, "Your book is empty", one line, and a primary "Make your first sticker".
- **Loading.** A grid of skeleton scraps (sage, breathing).

## Tape studio (new)

Opened from the sticker book ("Tape" tab or "+ New tape"), and from any collage/journal page when the user adds tape.

- **Desktop.** Two columns. On the left is the stage: a notebook-ground area with a sample scrap and the tape across its top edge. A round turn handle sits at the tape's end and can be dragged to any angle, or nudged with the arrow keys ±5°. Under the stage is **My tape roll**: saved tapes as small strips with names, and tapping one loads it. On the right are the controls:
  - **Direction**: chips −45 / −15 / 0 / +15 / +45 / +90, each with a tilted line glyph.
  - **Length, Width, See-through**: sliders.
  - **Ends**: Torn, Cut or Pinked.
  - **Print**: a PatternEditor.
  - A primary "Add to my tape roll".
- **Mobile.** One column: stage, controls, roll. The turn handle grows to a 44px touch target.
- **In a page.** Tapes from the roll are dragged onto the page. Each placed piece keeps its own angle and length, with the handle shown on selection, and the print and ends come from the saved tape.

## 404

The ground carries a giant apricot "404" in Special Elite (120px, −3°, `aria-hidden`), overlapped by an EmptyState scrap with a leaf sticker, "This page fell out of the book", a short reason and a primary "Back to the start". The masthead stays.

## Shared states

| State | Pattern |
| --- | --- |
| Loading (inline) | Typing dots after the verb: "Saving…" |
| Loading (area) | The tape-reel loader plus a verb |
| Loading (grid) | Skeleton scraps at tile size, flat sage |
| Empty | EmptyState scrap with one sticker, a title, one line and one action |
| Error (field) | Blush field, raspberry wave, plum message with icon |
| Error (page / action) | Error toast (blush, `role="alert"`) |
| Success | Celery toast with a check, `role="status"`, 4s |
