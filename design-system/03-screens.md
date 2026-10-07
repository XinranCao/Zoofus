# Screens

Each screen has a live preview card (Components → Screens) showing a 390px and a 1280px frame side by side. Layouts switch at **760px** on the container, with mobile below it. Grids are loose on purpose. Content aligns to a 12-column, 1184px-max container (gutter `space-12` on desktop, `space-4` on mobile), and individual scraps tilt and overlap their column edges by a few pixels.

Popeye-style layout habits used throughout:

- A small numbered `kicker` above each section title ("NO. 01 · STICKER MAKER", "NO. 02 · STICKER BOOK").
- Big, confident `display` titles set flush-left, with generous space above sections (`space-12` desktop).
- One loose cluster of stickers as the only "image" on a page. There are no stock illustrations.

## Masthead

- **Desktop.** A full-width `peach-100` band, torn on the bottom edge only (`xl`, measured), padding 14 / 48 / 22. The wordmark sits left. On the right are the nav links (`label`, `ink`, with the current page in `ink-deep` plus a hand-drawn underline) and a 40px avatar that opens the AvatarMenu.
- **Signed out.** The same band, with the language button (中文 / English), a quiet "Log in" and a small "Sign up" button. On the landing the primary is the brick button in the page, so "Sign up" in the masthead is secondary (mustard) and, on a phone, "Log in" is left out of the band (it is under the main button).
- **Mobile.** Padding 12 / 16 / 18 and a 26px wordmark. A menu button (44 × 44 touch target) replaces the nav and opens a torn `scrap` sheet from the top-right. The sheet holds the avatar and name, a divider, then Make / Library / Friends / Journal together / Account / Log out, with the current item highlighted in `selected`. The nav names are Make, Library, Friends and Journal together (一起做手账), each a single term used everywhere. It is a Radix DropdownMenu at both sizes.
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

## Landing (signed out, `/`)

Replaces the old redirect to the login page. It answers "what is this?" in one screen and has one brick button.

- **Hero (desktop).** A `scrap` card (lg, two tapes) on the left: kicker "For journals and chats", the `h1` "Turn your photos into stickers.", one line of body, the primary "Make your first sticker", a quiet "I already have an account", and the fine line "First a quick sign-up: just an email and a nickname. Free to use." On the right, the three-step demo drawn from real parts: a photo with a lasso, the die-cut sticker, the journal page it is stuck on, with the captions "1 Pick a photo / 2 Cut it out / 3 Stick it down".
- **Below the hero.** "What you can make": four scraps (Stickers, Tape, Journals, Together) in `scrap`, `scrap-warm`, `scrap-cool`, `scrap-pink`; a share strip ("Save a sticker as an image and send it anywhere: a chat, a card, a shop label", and in Chinese 微信 and 小红书); a lock icon with the privacy line; a closing "Got a photo handy?" with the same primary.
- **Phone.** Hero first, then the demo with its three steps in one row and the captions under each, the cards two by two, no sticker row in the share strip. On a screen shorter than 700px the pitch under the log-in form is hidden so the form stays in the first screen.
- **The log in page** keeps its form and gains a small "New to Zoofus?" scrap with one sentence and a quiet link back to the landing.
- No price, no tagline next to the wordmark, no emoji. The `h1` is page copy; the wordmark stays alone in the masthead.

## Home (signed in, `/`)

The home is a craft desk, not a dashboard. It starts with a greeting by the time of day on the device clock (morning 05:00 to 11:59, afternoon to 17:59, evening to 21:59, night after that: "Morning, Mia." / "Still up, Mia?") and a weekday kicker. One of four layouts shows, decided by `features/home/homeData.ts` from data the app already holds (counts and the newest few items; the home never reads a whole collection):

- **New account** (nothing made). A hero scrap "Hi Mia. Let's cut your first sticker." with the primary "Upload a photo" and a quiet "Or drop a photo anywhere on this page" (hidden on touch), the photo-to-sticker demo, then "Four things to try": Cut a sticker, Make a tape, Fill a journal page, Add a friend. Each card has a stamp: "Start here" on the first one not done, "Done" on those that are. Under them the cherry empty state and an "Idea of the day".
- **Returning** (has something). The "Pick up where you left off" card (lg scrap, two tapes): the last journal's page picture, its title, "Edited yesterday", and the primary "Continue" with a secondary "New sticker". Then "Recently cut" (up to five stickers, "See all"), "Latest journals and tapes", and a "Try next" strip pointing to the first thing not yet used (journal, tape, friend, collection); the strip is hidden when everything is used.
- **Waiting** (a friend request, a shared sticker or tape, a Together invitation). Same as returning, with a "{n} things are waiting for you" scrap (`scrap-cool`, one tape) of up to three rows, newest first, one button each (Accept, Take a look, Join), in place of the idea. The nav shows the same count.
- **Away** (14 days or more). "Long time no see, Mia. Everything is where you left it." and the continue card, with a "Need a refresher? How it works" strip. No statistics, no apology, no changelog.
- One brick button per view. The stamp is an SVG oval with a hand-lettered word (never a `border-radius`). Dropping a photo anywhere on the home opens the sticker maker with it.
- **Loading.** The cards keep their size as skeletons (flat sage), so nothing jumps when the data arrives. **Errors** in one card do not hide the others.

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
  - **Edge fill**: a PatternEditor with Solid, Stripes, Dots, Gingham, Check, Wave, Pixels (8 × 8 stamp) and Doodle (draw a tile), plus paper and ink colours, size, turn and weight. In Pixels, the small square beside the 8 × 8 grid previews the tile with the chosen size and turn.

  The footer has a quiet "Back to editing", a secondary "Save to Library" and a primary "Download PNG". On mobile the controls stack under the sticker; the preview is small (about a fifth of the screen) and stays pinned above the options (`StudioPreview`) while they scroll; the edge shape, the pattern and the colours are drop-downs (`Select`, `ColorDropdown`: a torn chip with the colour and its name that opens four-wide swatches); the pixel grid and the doodle pad are small, so a finger that is only scrolling rarely lands on them; and the footer stays at the bottom of the sheet. After saving, show the toast "Saved to your Library."
- **Keyboard.** ⌘/Ctrl-Z undo, ⇧⌘Z redo, Delete removes the selected shape, Esc closes (with a confirmation if there is unsaved work), and Enter runs "Cut it out". Tooltips show the shortcuts. A "Keyboard shortcuts" note under the tools starts closed and opens only when the person opens it: nothing in the dialog moves while someone is circling the photo, and drawing on the photo never reopens it.
- **Shapes** are drawn by dragging on the photo (no "Add shape" button); Space adds a default one from the keyboard.
- **After saving**, step 2 is read-only (a saved sticker's edge is changed later with "Edit edge" in the Library), the Save button is pressed once (one press makes one sticker), the name field shows a placeholder with the time, and the preview keeps the sticker's shape whatever the width.

## Library (stickers, tapes, journals)

One set of tabs (Stickers, Tapes, Journals, Collections) sits above a `PageHeader` (title, a line, the page's own actions, and one small die-cut sticker beside the title that belongs to the page). The title starts in the same place on every page.

- **Tiles.** Sticker, tape, journal and folder tiles share one shape: the name above the picture, the date or a short line below, the same actions (Rename, Share, Add to a collection, Delete; Edit edge for a sticker, Edit for a tape), shown on hover or focus-within and always on touch. A few tiles carry tape.
- **Stickers.** A 5-column grid on desktop, 2 on a phone. The Library reads 40 at a time and ends with a secondary "Show more". A tile asks for the sticker's small picture (320px WebP, 20 kB at most); the full file is for the open view and the journal page. Past 100 loaded tiles the browser skips drawing the ones far off screen.
- **Select.** "Select" turns the tiles into toggles with a `SelectMark` (lime with a check, never colour alone) and shows the `BulkBar` at the bottom: how many, select all, Add to collection, Share, Delete, Done.
- **Rename.** The name turns into a TextField in place. Enter saves and Esc cancels.
- **Delete.** One sticker: a confirmation dialog, then the toast "Deleted" with "Undo" for 6 seconds, and the files are removed after that. Several: a confirmation with the count.
- **Detail.** A Dialog with the date and size, the name as `h1`, the sticker large with zoom and pan, danger "Delete" on the left and "Rename", "Edit edge" and "Download PNG" on the right.
- **Empty.** An EmptyState (peach, washi tape) with a small sticker, "No stickers yet", one line and the primary "Make your first sticker". **Loading** is a grid of skeleton scraps; after 300ms a polite loading note, and after 3 seconds "Still working. This is taking longer than usual."
- **Tapes** list the tape roll the same way (the studio opens in place to edit one). **Collections** are folders (a `Folder` tile with up to four small pieces in it); a collection holds pointers, never copies.

## Journals

- **List.** The same tile, with the page's own picture (a WebP of the page, 480px), the title above, and the date. A journal that has no picture yet is drawn from its items, so a tile is never blank. The list reads 30 at a time with "Show more". "New journal" opens a small dialog (title, paper size) and then the studio.
- **Studio, desktop.** The page on the notebook ground fills the middle. A top bar: back link, the title (editable), one plain save line (`SaveStatus`: "Saved", "Saving…", "Not saved yet"), Save, Undo / Redo, zoom, Paper (size, paper, ruling, colour) and Download. A tool column on the left (Move, Sticker, Tape, Text, Draw, Erase) and a panel on the right for the selected thing (size, turn, order, copy, delete; for text its font, size, colour and bold; for a pen line its tool, colour and size).
- **Pens.** Pen, pencil, marker and crayon look like their real marks (a pencil's grain, a marker's overlap, a crayon's waxy break). They are painted per stroke into canvases with a grain fixed to the page, and a stroke is still stored as a short vector string.
- **Several at once.** With Move, dragging on the empty page draws an area that picks the things inside; they get one box with a turn handle and move and turn together. "Select several" (touch and mouse) lets taps add and remove things. Copy and Paste buttons, and ⌘/Ctrl C, X, V, D, A, work too; copies land 16 units aside and are chosen.
- **Tablet (500 to 1099px).** The panel docks beside the page.
- **Phone (under 500px).** The top bar is one row that never wraps: an arrow-only back link, the title, the save line, Save, and a dots-only More that holds Undo, zoom, Paper and Download. The six tools are a fixed bar along the bottom (a dashed top edge drawn as a gradient, not a border), and the text or item panel opens as a sheet above it. More than half of the screen is page.
- **Saving.** Items are written 2 seconds after the last edit and at most 15 seconds after the first unsaved one; the page picture 8 seconds after the last edit and at least 20 seconds apart; and both on leaving. A typed title is also kept as a draft in the browser.

## Friends and "Shared with you"

- **Friends.** Your friend code (shown, copyable), "Add a friend" by code, requests in and out (Accept, Decline, Cancel), the list with a nickname you can set, and "Shared with you". A nav badge counts requests and shares you have not looked at.
- **Shared with you.** A grid of scraps (alternating `scrap` and `scrap-warm`): the picture, the name, who and when, an optional note, and "Add to my stickers" (or tapes, or journals) with "Not now". A shared journal shows its page picture, or is drawn from what was sent. Thirty are listed, then "Show more". What you keep becomes your own copy.
- **Share dialog.** Choose friends, add a note (200 characters), send; the sender can take a share back from the list of what they sent.

## Journal together

- **List.** Your pages and the invitations waiting for you (Join, Decline), with each page's picture. "New page together" asks for a title and invites friends (up to 8 people).
- **Page.** The same studio, live: everyone's items appear as they are placed, a coloured name tag follows each person's pointer, and the shelf holds the pictures people brought. The same save line shows. "Save a copy" makes a journal of your own with the pictures copied into your folder. The owner can end the page, and everyone else can leave.

## Account

A scrap card with the profile picture (a sticker or a photo), the nickname, the language, "Download my data" (a JSON file of everything stored), and "Delete my account" (type DELETE and the password). The page says in plain words what is kept and who can see it.

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
| Loading (area) | The tape-reel loader plus a verb; after 300ms a polite note, after 3s a "Still working" line |
| Loading (grid) | Skeleton scraps at tile size, flat sage |
| Empty | EmptyState scrap with one sticker, a title, one line and one action |
| Error (field) | Blush field, raspberry wave, plum message with icon |
| Error (page / action) | Error toast (blush, `role="alert"`) |
| Success | Celery toast with a check, `role="status"`; toasts stay 8 s (10 s for an error or one with an action), pause on hover and focus, and close with their button or Esc |
| Save status | One plain line, `role="status"`: Saved / Saving… / Not saved yet. Never a modal, never takes focus |
| Pending action | The button shows the verb in progress ("Starting…") and ignores a second press |
