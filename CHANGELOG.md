# Changelog

## v1.4.0 – 2026-10-04

### Features

- Together: **Save** is now the main button (with a "Saved" state and a note on when it last happened); Save a copy is the second one. Edits still reach everyone live; Save refreshes the page's picture in the list.
- The tools in the journal and Together studios sit two to a row.
- The pages in Collections use the same size and spacing as the sticker library (a collection's contents too, with stickers at the library size).

### Fixes

- Autosave no longer interrupts you: the picture is drawn from the layers into a separate canvas (the selection handles used to be hidden for a moment, which looked like a refresh), changes that only echo your own edit are ignored, and autosave runs at most once a minute (it was every four seconds in journals).
- The small pixel preview in the tape studio now follows the pixel size you choose, as well as the turn.

## v1.3.0 – 2026-10-04

### Features

- Stickers can be named when you save them (the date is only the default).
- Tapes in the library get the same hover actions as stickers (Share, Rename, Delete) and can now be edited afterwards: change the print, size, ends and name in place.
- Names sit above the picture on stickers, tapes, journals, collections and Together pages.
- Together: the list and the copy you save now show the page as it looks (a small picture kept up to date as people edit), not just the paper.
- The Together "bring in" window is now "Add to this page": one card per sticker or tape with its tick and name together, a clear "Add 3" button, and a shorter "Add from my library" button that matches the others.
- The circle round the chosen language is a smoother, rounder, pencil-like loop.

### Fixes

- The torn sticker edge could grow thin spikes; the edge is now smooth noise with eased bites, and a test keeps it that way.
- Tape tiles' hover actions did not appear; they do now.

### Other

- New security rules (tapes can be edited; a Together page can carry a thumbnail): **deploy them before releasing**.
- The release process in `CLAUDE.md` now says that "release" is standing permission for the whole process, and that the README and other docs are brought up to date before every release.

## v1.2.0 – 2026-10-04

### Features

- Tapes behave like stickers in the library: the same hover lift, and Share and Rename on hover.
- A collection's folder shows everything in it when you point at it: stickers, tapes and journals.
- A journal's picture in the list is refreshed every time the page is saved (also by autosave).
- Layers in the journal studio (and in Together) can be moved one step forward or backward, not only to the very front or back.
- Together: the "here now" list shows only faces, with the name (the one you gave your friend) on hover; no more Leave button inside a page.
- The chosen language on the bar is circled by hand instead of underlined.
- Sharing shows what is being shared.

### Fixes

- Sharing a sticker, editing its edge and saving a copy of a shared page could fail on the live site when the browser had already cached the picture from a plain image. Pictures are now read around that (cache skipped, then through Storage), a failure says why in a short code, and error notes disappear on their own after a few seconds.
- Editing a sticker's edge no longer stops over older values in parts of the sticker that are not being changed (the rules check only what changes).
- "Shared with you" counts what is waiting, and what you keep leaves the list.
- The red dot for Together invitations was drawn in the wrong colour; fixed.

### Other

- Stickers in the library are larger and closer together; the tape studio loses its preset angle buttons (turn the tape by hand); "Make" has no plus; collection names are no longer suggested.
- New security rules (sticker updates check only what changes): **deploy them before releasing**.

## v1.1.0 – 2026-10-04

### Features

- Journal studio: the eraser now rubs out only the part of a line it passes over, not whole lines. Stickers and tapes can be stretched freely (any handle, any direction; "Undo stretching" restores the shape). Clicking where objects overlap picks the one you pointed at (see-through corners of a sticker are ignored), and clicking the chosen one again picks the next one underneath.
- Fonts are a drop-down, grouped, with each font shown in its own style: many more Chinese handwriting fonts (刘建毛草, 志莽行书, 站酷小薇, 站酷庆科黄油 and more) and more handwritten English fonts. Page size and paper pattern are drop-downs too.
- Newspaper and magazine paper are textures only (newsprint, aged newsprint, glossy, matte): no columns, headlines or boxes.
- Share straight from a tile: hover a sticker, tape or journal and use Share. Something a friend shares can be kept only once; afterwards it shows "Added to yours".
- Collections look like a folder with their stickers lying in it; point at one and they spring out.
- Library pages: the tabs sit above the title, the title is in the same place on every tab and carries one small sticker beside it; stickers are larger and closer together; no more tape on some stickers; "Select" is now "Manage".
- Friends: requests, accepted friends, shares and invitations appear live, without refreshing the page.
- Friends' pictures show for everyone: a small copy is kept in the public profile.
- Together: stickers a friend brings are visible to everyone (stored inside the shelf entry, no extra Storage); you choose which of your stickers and tapes to bring; Together gets a red dot when an invitation is waiting.
- The Make menu opens its dialog over the page you are on instead of taking you to the library.

### Other

- New security rules for the above (stretch, kept shares, inline pictures, aged paper): **deploy them before releasing**.

## v1.0.1 – 2026-10-04

### Fixes

- Release pipeline: a unit test no longer needs Firebase settings, so the release build runs on CI. v1.0.0 (below) was tagged but its build stopped at that test and was never deployed; v1.0.1 is the first deployed 1.0 release.

## v1.0.0 – 2026-10-03

### Features

- Journals (手账): a page studio with custom size, paper (notebook, newspaper, magazine) and styles, stickers and tapes placed freely, text in common and handwriting fonts, drawing (pen, pencil, crayon, …), erase, undo/redo, PNG export; a journal gallery with thumbnails.
- Collections of your own for stickers, tapes and journals, with bulk select, add, remove and delete.
- Friends: a friend code, requests, nicknames only you see; share stickers, tapes and journals; a "Shared with you" inbox; keep what friends share.
- Together: make a journal page with friends in real time (invite, shared shelf of stickers and tapes, who is here, everyone can save a copy).
- Nickname at sign-up, a profile card (change the nickname, make a profile picture with the sticker maker or pick a sticker), the picture keeps its sticker shape in the navigation bar.
- New navigation: one "Make" menu for stickers, tapes, journals and together; a "Library" with tabs; the language switch sits on the bar.
- Tapes live on their own page with a "New tape" dialog; stickers and tapes are separate tabs.

### Fixes

- Torn edges of small pieces (profile picture, paper and ink pickers) are calmer: no more long thorn-like spikes.
- Clicking a sticker under "Recently cut" opens a preview instead of the book.
- The Stickers/Tapes switch no longer disappears on narrow screens.
- "Edit edge" reports a specific error code when it fails and is more tolerant of leftovers from earlier saves.

### Other

- New security rules for journals, collections, friends, shares and shared pages (**deploy them before releasing**); account deletion removes the new data too; README rewritten.

## v0.4.1 – 2026-10-03

### Other

- The two timing checks (tear generation, torn die-cut) run on a developer machine only; CI runners are too slow and variable for them. No change to the app.

## v0.4.0 – 2026-10-03

The redesign and the Chinese interface.

### Features

- New look on the Zoofus design system (Tailwind v4 and Radix; the MUI interface is gone): torn-paper pieces, tape, typewriter type, on a notebook ground. Every screen is restyled for phone and desktop, in English and Chinese (中文).
- Sticker edge studio: choose the edge (smooth, wobbly or torn), its width and a print (stripes, dots, gingham, check, wave, pixels, doodle, or a plain colour) from 16 colours. "Edit edge" on any new sticker in the book redoes it. The downloaded PNG now matches the on-screen preview at any size.
- Tape studio at /tape: turn, size and print a tape and keep it on "My tape roll"; the four starter tapes stay on the roll.
- Shapes are drawn by dragging on the photo; there is no "Add shape" button. Space adds one from the keyboard.
- A freehand selection that leaves the photo and comes back elsewhere includes the corner it goes round.
- Paint pixels by dragging across the grid.
- A language switch (EN · 中文) in the account menu, and a "Continue with Google" button that follows Google's branding.
- Dialogs never grow past the screen: the title and the buttons stay in view and only the middle scrolls, with no second scrollbar behind.

### Fixes

- The sticker book could say "We couldn't load your stickers" for stickers saved with a print by a development build. Saved data is now read leniently: one unreadable sticker or tape can no longer hide the rest.
- No layout shift while stickers load; buttons and fields are at least 44 px to tap on a phone.
- Deleting a sticker removes both its stored images.

### Other

- Faster start: the sticker maker (113 KB), the Chinese fonts and Analytics are loaded only when needed. Lighthouse (mobile, signed in): Performance 96–99, Accessibility 100.
- Security rules now bound user-designed prints (colours, sizes, strokes) and PNG uploads (10 MB). They were deployed before this release.
- Tests: 255 unit, 37 security-rules and 48 end-to-end tests, including accessibility, contrast, torn-edge, Chinese-font, reduced-motion, touch-target, dialog-scroll and screen-versus-file checks.

## v0.3.1 – 2026-10-03

Image handling and the sticker gallery.

### Features

- Click a sticker in My Stickers to preview it full size in a pop-up: zoom with the buttons, mouse wheel, double click or pinch, drag to move around, Escape to close. Transparent areas show on a checkerboard.
- Saved stickers are compressed: scaled to at most 1,280 px and stored as WebP (quality 82, stepping down to 60 if needed, 400 KB target), so each sticker is typically under 100 KB. The My Stickers grid shows this full-size image (lazy-loaded) instead of a tiny thumbnail, so stickers look sharp; old thumbnails are no longer used. "Download PNG" is still full quality.
- Profile photos are scaled to 512 px and compressed to JPEG before upload (they used to keep their full dimensions).

### Other

- Storage rules now accept WebP or PNG stickers up to 2 MB and profile photos up to 2 MB (was 10 MB and 5 MB), deployed right after this release.
- Uploads need the Firebase Blaze plan (Cloud Storage no longer works on the free Spark plan); documented in `docs/security-setup.md`.
- Saving logs the real error in the browser console.

## v0.3.0 – 2026-10-03

Architecture rewrite and app foundations. The visual redesign moves to v0.4.0.

### Features

- Sticker book: save a cut-out to your account, with a thumbnail, then list, rename and delete it on the new My Stickers page.
- Real undo and redo in the sticker editor (the old "Redo" only reset everything), plus Clear.
- Editor keyboard shortcuts (arrows move the selection, Delete removes it, Ctrl/Cmd+Z undoes) and touch handling for drawing.
- Account page: download all your data as JSON, delete your account and everything in it.
- Email verification: new password accounts get a verification email and a reminder banner.
- Photos are rotated by their EXIF orientation, large photos are downscaled for editing, and unsupported files get a clear message.
- Error screen and a 404 page.

### Security

- Firestore and Storage rules are owner-only with validated fields, size and type limits. Deployed to production, with emulator tests.
- Firebase App Check is wired in (needs the one-time console setup and a site key; off until then).
- Limits: 200 stickers per account, 9.5 MB per sticker. Sign-up requires 8-character passwords.
- Branch protection on `dev` and `main`; Dependabot enabled.

### Fixes

- The cut-out canvas was rebuilt endlessly because its size object changed every render.
- Account and sticker deletion no longer fail when a file is already gone; failed saves clean up their uploads.
- The error screen clears when you navigate; cached data is cleared on sign-out.
- The first uploaded image no longer fails to load.

### Other

- Migrated to TypeScript (strict) with ESLint, Prettier and a feature-based structure (`@/` alias).
- Redux replaced by TanStack Query (server data) and Zustand (editor state); forms use react-hook-form and zod; environment variables are validated at startup.
- The sticker editor is rebuilt around a unified selection model with a pure, tested mask engine.
- Data model for collage and journal pages (schema, operations, API, rules; no UI yet).
- Local Firebase emulators (`npm run emulators`, `npm run dev:emulated`) and documented environments.
- Tests: 94 unit and component tests, 21 security-rule tests and an end-to-end flow on the emulators, all in CI.
- Docs: UI style brief, App Check and security setup guides.

## v0.2.0 – 2026-10-02

### Features

- Download the masked cut-out as a PNG from the Image Lasso confirm view.

### Fixes

- Profile setup now awaits the upload and surfaces errors instead of navigating early and swallowing failures.
- Firebase Analytics is only initialized in supported browsers.
- Cleared all `npm audit` findings (17 -> 0); pinned rollup 4.59.0 (4.64.0 hangs the build).

### Other

- Tag-triggered release workflow (test, build, Firebase live deploy, GitHub Release); PR previews now run tests and build with Node 22.
- Vitest + Testing Library setup with first tests; CI workflow (test + build) on pushes and PRs.
- Lazy-loaded the Image Lasso panel and split vendor chunks (main bundle 1.5 MB -> 244 kB).
- Removed Create React App leftovers (`App.css`, `logo.svg`, `reportWebVitals`, `manifest.json`, unused config).
- Added a contributor-facing README, `CLAUDE.md` project guide, and a `@claude` GitHub Actions workflow (`.github/workflows/claude.yml`).

## v0.1.0 – 2025-10-20

First release: authentication, user profiles and the Image Lasso tool.

### Features

- Email/password and Google sign-in, password reset, protected routes, responsive auth pages and top nav bar.
- Two-step sign-up with nickname and compressed profile picture (Firebase Storage + Firestore); avatar shown in the nav bar.
- Redux Toolkit store for the user profile.
- Image Lasso: upload an image, draw freehand lasso selections (mouse and touch, multiple paths, auto-closing), add rectangle/triangle/star shapes, switch between select and deselect modes, delete shapes, undo the last action, and reset.
- Masked cut-out preview with adjustable border color and width (0–100), including borders on clipped edges.

### Fixes

- Firebase Hosting rewrite for client-side routing.
- Default profile picture; promise handling fix.

### Other

- Refactored ImageLasso into hooks and a shared context; styling and layout updates.
- Firebase Hosting preview workflow for pull requests.
