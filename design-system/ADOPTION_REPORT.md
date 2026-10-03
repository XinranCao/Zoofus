# Design system adoption report

Branch: `dev` (the repo's only development branch; see `ADOPTION_PLAN.md`). Nothing is released or deployed.

## What changed

- **Foundations:** Tailwind v4 theme generated from `01-tokens.md` (`src/styles/theme.css`), fonts (Special Elite, Courier Prime, Xiaolai Mono SC → LXGW WenKai → Noto Serif SC), notebook ground, i18n (en, zh-CN).
- **Primitives (`src/paper`):** seeded torn clip pairs, patterns (8 kinds, 16 user colours), scribble, `dieCut` and `renderSticker`, zod schemas; unit tests for each.
- **UI kit (`src/components/ui`)** on Radix (dialog, dropdown, toggle group, slider, popover, toast, tooltip, label) with a dev gallery at `/dev/design-system`.
- **Screens:** masthead and shell, log in, sign up (2 steps), reset password, home, sticker maker (lasso, edge studio), sticker book (grid, detail with zoom, rename, delete with Undo, edit edge), tape studio (`/tape`), account, 404, error boundary.
- **Data:** stickers now store an edge-less source plus `edge` and `seed`; tapes live in `users/{uid}/tapes`. Preview, saved file and PNG download all come from `dieCut`.
- **Removed:** MUI, Emotion, Less, react-color, react-icons.

## Verification (`e2e/design-system.spec.ts`)

For 23 states of every screen at 390×844 and 1280×800, screenshots are saved in [`verification/mobile`](verification/mobile) and [`verification/desktop`](verification/desktop), and these checks run and pass:

- no computed `box-shadow`, `text-shadow` or blurred `drop-shadow`
- no `border-radius` or border on chrome (only avatar image, photo, canvas, drop zone, images)
- axe-core (WCAG 2.0/2.1 A and AA): zero serious or critical violations per state
- `<title>` is `Zoofus` or `Zoofus · <page>`; no tagline beside the wordmark; no meta description tagline

Also covered by the main suites: 212+ unit tests, 29 security-rules tests, and the full emulator e2e (sign up, cut, save, edit, delete, tape, delete account).

Fixed during verification: Radix modal menu hid `#root` while keeping focusable nodes (axe `aria-hidden-focus`); menus are now non-modal.

## Not verified yet / open points

- Side-by-side comparison against `gallery.html` was by eye on a sample of screens only; no pixel diff.
- Not exercised automatically: reduced-motion, Chinese screenshots (fonts are wired, `zh-CN` catalogue complete), export-parity pixel diff, text-contrast ratio sweep beyond axe's own check.
- PatternEditor pixel/doodle modes have component coverage through the studios' e2e only, not dedicated unit tests.
- **Production rules are not deployed.** Deploy before releasing: `firebase deploy --only firestore:rules,storage --project zoofus-48264`.

## Decisions and open questions (`04-open-questions.md`)

- Work stays on `dev` instead of `design-system/zoofus-v2`.
- Konva stays for selection interaction; only its look changed.
- Language switch placed in the account menu (signed in) and a quiet button (signed out).
- Sticker edge width is proportional to the image size.
- Still to confirm with the designer: Xiaolai family name, navy/plum use, pinked tape ends, LXGW weight (500), torn lip colour, the Google sign-in button style.


---

# Round 2

Closes the gaps from round 1 and gets the app release-ready. Tag `ds-v2-round1` marks the state before it. Everything is on `dev`; **nothing was deployed** and no data was migrated.

Before the phases, three problems found in manual testing were fixed (commit `FIX: keep starter tapes, drag to paint pixels, lasso keeps the corner…`):

1. The four starter tapes vanished once a tape was saved. They now always follow the user's own tapes on the roll.
2. The pixel editor (tape prints and sticker-edge prints) paints by dragging: press on a cell and every cell the pointer crosses takes the same state (a drag that starts on a lit cell erases). Click, Space and Enter still toggle one cell.
3. The freehand lasso now tracks the pointer on `window` and clamps points to the photo's border. Leaving the photo on one side and coming back on another runs along the border and round the corner, so the whole corner is selected (tested by reading the dimming of a corner pixel).

## Phase 1. Screen = file

- Updated `components/bundle.js`, `02-signature-elements.md`, `components/Sticker/README.md` from the designer's package.
- Edge width is `round(0.045 × L × scale)` with no px clamp (`edgeWidth`, `EDGE_RATIO`); pattern fills scale with `L / 300` (`PATTERN_REF`). The old `stickerBorder` and the 2px minimum are gone. The edge studio's px readout shows the value at the preview size.
- The book grid and detail dialog show the stored image scaled down; `dieCut` is only called at the size it will be shown or exported.
- **Deviation from the spec text, needed to meet its own 2 % test:** the pattern is anchored to the middle of the sticker (`patternSVG(..., anchor)`) instead of the padded canvas's corner. The padding rounds differently at each size (`ceil(bw × 1.9 + 2)`), which shifted a stripes print by several pixels between 300 px and 1200 px and failed the parity test at 4–6 %.
- `src/paper/parity.test.ts` (`@napi-rs/canvas`, no browser): L = 300 against L = 1200 scaled down, for smooth, wobbly and torn, each with a solid and a stripes fill. All six pass (< 2 % mean channel difference, mask IoU > 0.97). It takes about 45 s, mostly the 1200 px torn edge in a software canvas.

## Phase 2. Existing stickers

- `Sticker.kind` is `'editable' | 'legacy'` (`stickerKind`: editable only when the edge-less source is stored). Legacy stickers display, download and rename; "Edit edge" is replaced by "Made before edge editing — cut it again to change the edge." (both locales).
- **No migration script was written.** A legacy sticker's border is baked into its only image, so there is nothing to recover; a script could only count them. Add `scripts/migrate-legacy-stickers.ts` (dry run by default) only if the owner wants the count.
- Delete already removed the rendered image, the source and a legacy thumbnail. New emulator e2e `e2e/storage-cleanup.spec.ts` lists Storage through the emulator's REST API: two objects after saving, none after deleting.

## Phase 3. Limits and rules

| Field | zod | `firestore.rules` | Rules test |
| --- | --- | --- | --- |
| `TapeSpec.name` 1–40 | yes | yes (existing) | yes |
| tapes per user ≤ 200 | `MAX_TAPES = 200`, client | not enforced: a rule cannot count a collection cheaply | – |
| `kind` | 8 kinds | 8 kinds | yes |
| `bg`, `ink` | the 16 `USER_COLORS` | the same 16 names | yes |
| `scale` 6–28, `angle` 0–180, `weight` 0.1–0.9 | yes | yes | yes, both edges |
| `pixels` | 8 × `^[01]{8}$` | size 8 and each row matched | yes |
| `strokes` | ≤ 60, ≤ 2000 chars, `^[MLQCSTZmlqcstz0-9 .,-]+$` | count ≤ 60 and the **first** stroke is checked: rules cannot loop over a list | yes |
| `edge.shape`, `edge.scale` 0–1.6 | yes | yes (shares `validPattern`) | yes |
| sticker upload | – | `image/png` ≤ 10 MB, or `image/webp` < 2 MB (the stored sticker is WebP by the compression policy); owner-only | yes |

- **Rules cannot validate every stroke.** The remaining defence is on the client: `DoodlePad` stops at 60 strokes and 2,000 characters, the schema rejects bad strokes when a document is read, and `patternMarkup` drops any stroke that is not plain path data and any colour that is not a palette name (`isSafeStroke`, strict `hex()`), so hostile data cannot reach the SVG. `pattern.test.ts` feeds `"/><script>`, `url(javascript:…)` and `…onerror=…` and asserts they are dropped.
- The default doodle used an arc command (`a`), which the required stroke pattern does not allow; it was redrawn with a curve.
- 37 rules tests (was 29).
- Existing documents that break the new limits (a free-form `ink`, a stroke with an arc) will fail the next update of that document, such as renaming a tape. Nothing is rewritten.

## Phase 4. Verification

`e2e/design-system.spec.ts` now visits all 23 states of every screen in six runs: English, Chinese and English with reduced motion, each at 390 × 844 and 1280 × 800. Screenshots are kept on disk in `verification/{mobile,desktop,zh}` (regenerated by the spec, not committed; the contact sheets, lasso photos and numbers are).

| Check | How | Result |
| --- | --- | --- |
| Reduced motion | `reducedMotion: 'reduce'`; every element and `::before`/`::after` has 0 s transition and animation | pass after adding a global `*{transition:none;animation:none}` rule (an SVG transition at 0.12 s was found) |
| Ants frozen | two screenshots of the lasso a second apart are byte-identical under reduced motion, and differ without it | pass (`lasso.spec.ts`) |
| Chinese fonts | CDP `CSS.getPlatformFontsForNode` on every CJK text node | only `Xiaolai Mono SC`, `Special Elite` and `Courier Prime` web fonts are used, never a system font (the Google button is exempt: Google's own type) |
| No overflow in Chinese | `scrollWidth ≤ clientWidth` on buttons, chips, tabs, radios, menu items | pass |
| English downloads no CJK font | font requests logged on every screen | pass. See "Fonts" below |
| Contrast | every visible text node against the nearest painted ancestor, AA 4.5:1 (3:1 for ≥ 24 px, or bold ≥ 18.66 px); decorative `aria-hidden` text and hover-only text are skipped | pass, 1,932 text nodes checked |
| Torn quality | unique `--clip` per element; `--fclip` ≠ `--clip` except quiet buttons; every text line's four corners (trimmed 18 % top and bottom for line-box room) lie inside the face polygon | pass after fixes below |
| Layout | one primary button per view and per dialog; ≤ 6 UI tapes; rotation within the token ranges; disabled controls at 0° | pass after fixes below |
| axe, flat, no radius, no border, titles, no tagline | as in round 1 | pass |

The **lowest contrast pairs** (all pass):

| Ratio | Needs | Colours | Where |
| --- | --- | --- | --- |
| 4.97 | 4.5 | `#57620d` on `#e8ddd0` | 12 px kickers and captions on the ground ("No. 02 · Sticker book", dates, tape names) |
| 5.15 | 4.5 | `#fbf6ee` on `#bc3b22` | labels on the brick primary button |

(The full top 20 per run is in `verification/contrast/*.json`.)

Problems the checks found, and the fixes:

- The masthead's primary "Sign up" next to the card's primary "Log in" broke "one primary per view". On the two auth pages the masthead one is now secondary. (The design itself shows both as primary.)
- Home tapes at −14° and 10° exceeded ±8°; now −8° and 8°. Tapes the user designs (studio, roll) are exempt.
- Two avatars (the menu button and the menu card) shared a tear, and all colour swatches with the same colour did; each now has its own.
- A bite in the sign-up card's torn edge cut the "P" of Password: auth card padding 26 → 34 px, and the phone sheet padding 16 → 26 px (the same bite hit the edit-edge dialog in Chinese).
- Quiet buttons have no visible face and now share one tear per size, which is also why a 60-sticker book generates two tears for its Rename and Delete buttons instead of 120.
- A drawn line (`Scribble`) inside a text field took the tap from the bottom of the input; it is now `pointer-events: none`, and a tap anywhere on the field's scrap focuses it.
- The 404 numeral is decorative and `aria-hidden`; text contrast does not apply to it (apricot on kraft is 1.55:1, as the design specifies).
- Colour names were English-only in the Chinese interface; all 17 are translated now.

**Fonts.** A Chinese page needs the ~620 `unicode-range` slices of Xiaolai Mono SC; their stylesheet alone is 60 KB gzipped. It is now loaded only when it is needed (the Chinese interface, or Han text a person wrote: nickname, sticker name, tape name). The four Han characters that English screens themselves use ("中文", "昵称") come from a 1.7 KB subset of the font (`src/assets/fonts/xiaolai-core.woff2`, declared under the same family name in `src/styles/fonts.css`; the font is OFL 1.1).

PatternEditor unit tests (`PatternEditor.test.tsx`, 24 tests): the output for each of the 8 kinds validates against the schema; Paper and Ink map to the 16 colours; Size, Turn and Weight map to 6–28, 0–180 and 0.1–0.9; the pixel grid toggles with click, Space and Enter and paints on drag; Clear; DoodlePad produces one valid path per stroke, caps at 60 strokes and 2,000 characters; Undo and Clear.

**Gallery comparison.** `e2e/gallery-compare.spec.ts` (run with `DS_GALLERY=1`; the gallery loads React from a CDN) writes a side-by-side sheet per component to `verification/compare/<Component>.jpg`: 17 primitives against their section of `/dev/design-system` and 13 screens against the app screenshots. Visible deviations, none structural:

- Screens show the real account where the gallery has sample data: the "verify your email" strip, the Stickers / Tape tabs on the book and tape pages, one sticker instead of ten, and Rename / Delete shown only on hover or focus.
- The masthead has an added language switch ("中文") when signed out, and a "Sign up" that is secondary on the auth pages (see above).
- The log-in card has "Continue with Google" as Google's own button (intended exception, below).
- The edge studio previews the sticker on a kraft well inside the dialog; the gallery shows it on the ground. The width readout shows the px at the preview size (9 px against 8 px).
- Dialogs: the gallery card shows an opened dialog; the dev page shows its triggers. The opened dialogs are compared through screens 03, 09, 18, 19 and 22.
- Sign-up and log-in cards are 8 px wider inside (padding for the tear), described above.

## Phase 5. Interaction

`e2e/interaction.spec.ts` (12 tests):

- **Menus** (non-modal): Esc closes and returns focus to the trigger; an outside click closes; Tab closes and moves on (Radix would otherwise trap it; handled in `Masthead.tsx`); the page behind is not `aria-hidden`; on a phone `body` scroll is locked while the menu is open (a wheel gesture does not move the page). Dialogs remain modal.
- **Lasso** (`lasso.spec.ts`): three strokes (5 px loden halo at 28 %, 2 px sheet base, 2 px dashes `6 6` / `3 5` in plum), a 600 ms cycle, the first-point ring and the 38 % loden dim were already in place and are checked on three photos (very dark, very light, busy) in `verification/lasso/`: the sheet and loden pixels are both present and at least one stands clear of the photo at 3:1.
- **Touch** at 390 px: every button, link, radio, slider, tab, menu item and input is at least 44 × 44 where a tap lands (measured with `elementFromPoint`, so a hit area bigger than the drawn shape counts). Done with real 44 px heights for chips and small buttons, invisible hit areas for buttons, sliders, swatches, the menu and close buttons, and 48 px spacing between swatches.
  - **Pixel cells are the exception:** 8 cells across 304 px give 38 px cells, so they are comfortable but not 44. A 6 × 6 layout would break the stored format (8 rows of 8). Painting is by dragging, which does not need a precise tap.
- The lasso canvas has `touch-action: none` and neither the page nor the dialog scrolls while drawing.

## Phase 6. Performance

| | Before (`ds-v2-round1`) | After |
| --- | --- | --- |
| JS needed to start, gzipped | 476 KB (index 148, radix 45, firebase 178, konva 106) | 368 KB (index 151, radix 45, firebase 172) |
| CSS needed to start, gzipped | 65 KB | 8 KB (the 620 CJK font-face rules are loaded on demand) |
| Sticker maker (Konva, polygon-clipping, studios) | in the start-up bundle | 113 KB, fetched when first opened, or on hover / focus of an upload button |
| Firebase Analytics | in the start-up bundle | its own chunk, loaded after the page |
| `/tape`, `/dev/design-system` | `/tape` was already lazy; the dev page is not in the production build | unchanged |
| Tears generated by the whole sticker book (60 stickers) at 4× CPU | not measured; the Rename and Delete buttons made 120 | 26 for the whole page (masthead, banner, tabs, tiles), 7–13 ms; coming back to the book generates none |
| Torn die-cut, 2000 px long side, 4× CPU | – | 31 ms solid, 39 ms with a stripes fill (wobbly 9, smooth 8) |
| Layout shift on log-in, home, book | 0.37 | 0 to 0.001 |

- **Torn generation** (`performance.spec.ts`): the target was under 8 ms for 60 stickers on a mid-range mobile profile. The 60 tiles themselves now cost two tears (quiet buttons share one per size); the page around them is 7–13 ms at a 4× CPU slowdown, which is just over the target on the worse runs. `tornPair` was also made about 18 % faster. Further gains need a coarser tear or generating off the main thread.
- **dieCut** is far under the 150 ms threshold, so no `OffscreenCanvas` worker was added. The live preview is already throttled to one render per animation frame.
- **Layout shift** came from a sticker canvas that is 300 × 150 until its first render and from a loading skeleton half the height of a real tile; both now reserve their final size.
- Fonts: the three Latin font files are preloaded from `index.html` by a small Vite plugin; `preconnect` for the Firebase hosts.
- **Lighthouse** (v12, mobile preset, signed in, production build served by `vite preview` against the emulators, so no real network): Performance 96 on a cold Home, 99 on Home, the book and the tape studio; **Accessibility 100 on all of them**. Real networks will differ. Raw numbers: `verification/performance-lighthouse.json`.
- The production `dist/` has about 650 files because the Chinese font is shipped as 620 slices; browsers fetch only the ones a page uses.

## Phase 7. Owner decisions

All recorded as **Decided** in `04-open-questions.md`.

| Question | Applied |
| --- | --- |
| Xiaolai family name | `Xiaolai Mono SC`, exactly as the installed `font.css` declares it; confirmed in `01-tokens.md`, `theme.css`, and by the CDP check |
| Navy vs plum | plum stays; there is no navy in the code |
| Pinked tape ends | only in the tape studio (user option); all UI tape is torn |
| LXGW WenKai weight | the package ships 300, 500, 700 and no 400, so 500 is the single weight used, only as a fallback for glyphs Xiaolai lacks. No screen needs bold CJK |
| Torn lip colour | a fixed `fiber` token, not user-settable. (The sticker's lip colour is chosen by `renderSticker`) |
| Google sign-in | `GoogleButton`, built from Google's current guidelines (read on developers.google.com/identity/branding-guidelines): light theme, white fill, 1 px `#747775` stroke, `#1F1F1F` text in Google Sans Medium 14/20 (Roboto / Arial where Google Sans is not installed), the unmodified four-colour "G", padding 12 / 10 / 12 px, label "Continue with Google" (translated in Chinese). It is not torn, clipped, rotated or recoloured and sits inside the torn card. **Recorded exception** to "everything torn", "no #fff" and "no borders"; the flat and radius checks exempt only `.zf-google`. **Google's guidelines recommend the Identity Services SDK button; this is a custom button, which they allow but do not recommend** |
| Language switch | in the account menu, "EN · 中文" as two radio items in one segmented row; signed out, a quiet button reading "中文" or "English" |
| Export size choice, free colour picker | not built |
| Legacy stickers | Phase 2 |

## Phase 8. Release readiness

- Suites at the end of the round: typecheck clean; ESLint clean; **248 unit tests** (30 files, including the 6 parity tests); **37 rules tests**; **29 emulator e2e tests** (6 design-system runs, 12 interaction, 4 lasso, 2 performance, 3 sticker flow, 1 storage cleanup, the dev gallery). Gallery comparison runs on request (`DS_GALLERY=1`).
- `RELEASE_CHECKLIST.md` lists the deploy commands, the rules changes, a manual smoke test and the rollback. **No deploy command was run.**

## Left for the owner

- Run the deploy in `RELEASE_CHECKLIST.md` when ready (rules first, then the tag-triggered hosting deploy).
- Decide whether to keep Google's custom button or switch to the official Identity Services button (the guidelines prefer it).
- App Check enforcement, the budget alert and the Auth restrictions (console steps from before).
- Optional: a `scripts/migrate-legacy-stickers.ts` count of legacy stickers (not needed for the release).
