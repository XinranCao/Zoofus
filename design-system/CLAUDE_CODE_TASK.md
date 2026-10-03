# Task for Claude Code: adopt the Zoofus design system

You are working in the Zoofus repository: React 19 + TypeScript, Tailwind CSS v4 and Radix UI. The folder `design-system/` (this folder) is the approved design system: the source of truth for how the UI looks and behaves. Your job is to wire it into the app and restyle the whole UI with it, working on your own from start to finish. Do not wait for confirmation between phases. Stop and ask only if a step would delete user data or change product behaviour that the design system does not describe.

## 0. Ground rules

- **Read before you write.** Start with `design-system/README.md`, then `01-tokens.md`, `02-signature-elements.md`, `03-screens.md` and `04-open-questions.md`, then every `components/*/README.md`. `components/bundle.js` and `components/bundle.css` are **working reference code**. Port their logic into typed modules; do not import the bundle into the app.
- **Hard rules** (from README → Design principles). Violating any of these is a bug:
  1. "Zoofus" is one wordmark. No tagline or slogan anywhere: UI, `<title>`, meta tags, emails.
  2. **Flat.** No `box-shadow`, no blurred `drop-shadow`, no elevation. The only `drop-shadow` allowed is the zero-blur focus trace.
  3. Every container is a **torn polygon pair** (face + fibre lip) from the seeded generator. No `border-radius` and no `border` on UI chrome. No zigzag or repeating edges for UI chrome.
  4. Low contrast between shapes, but text meets WCAG AA. Use only the pairs listed in `01-tokens.md`. No `#000`, no `#fff`.
  5. Type: Special Elite (display) + Courier Prime (body). Chinese: Xiaolai Mono SC, falling back to LXGW WenKai, then Noto Serif SC.
  6. Light theme only. Respect `prefers-reduced-motion`. A visible, in-style keyboard focus ring everywhere.
- Work on a new branch: `git switch -c design-system/zoofus-v2`. Commit after each phase with a clear message.
- Do not change backend calls, routes, auth logic or data models, except where §6 adds new client-side models for tape and sticker edges.
- Use the project's package manager (check for a lockfile). Keep the dependencies you add to the ones listed below.

## 1. Survey (no code changes yet)

1. Map the repo: entry point, router, global CSS, Tailwind setup (`@import "tailwindcss"` and `@theme`), the component folders, and where each screen lives (masthead/nav, auth: log in, sign up step 1 and 2, password reset; home; sticker maker dialog; sticker book if present; 404).
2. Find the current sticker export code (canvas or PNG) and the lasso/shape canvas code.
3. Write `design-system/ADOPTION_PLAN.md` with:
   - a table that maps each existing component and screen to its design-system counterpart, with the file paths;
   - anything in the app the design system does not cover;
   - anything in the design system the app doesn't have yet (Sticker book, Tape studio, Sticker edge studio).
4. Commit: `docs: design system adoption plan`.

## 2. Foundations

1. **Tokens.** Create `src/styles/theme.css`. Copy the full `@theme { … }` block and the `:root` block from `01-tokens.md` → "Tailwind v4 @theme" exactly as written, and import it from the global stylesheet after `@import "tailwindcss";`. Keep `--shadow-*: initial;` and `--drop-shadow-*: initial;` so shadow utilities stop existing. Also add the semantic CSS variables the components expect: copy `design-system/tokens.css` into `src/styles/tokens.css`, or derive the same names from the `@theme` colors.
2. **Fonts.** Install `@fontsource/special-elite`, `@fontsource/courier-prime`, `cn-fontsource-xiaolai-mono-sc-regular` and `@fontsource/lxgw-wenkai`, and import them as shown in `01-tokens.md` → "Fonts, self-hosted". Open the installed `cn-fontsource-xiaolai-mono-sc-regular/font.css` and use the exact `font-family` name it declares in `--font-display` and `--font-body`. The doc assumes `"Xiaolai Mono SC"`; fix it if it differs. Add `:lang(zh) { line-height: 1.75; letter-spacing: .02em; }`. Set `<html lang>` from the active locale.
3. **Ground.** Apply the notebook ground (§6 of `02-signature-elements.md`: kraft, grain and a 22px dot grid) to `body`. Remove any existing shadows, radii and borders from global styles.
4. Run typecheck, lint and tests. Commit: `feat(ds): tokens, fonts, ground`.

## 3. Signature primitives (`src/paper/`)

Port these from `components/bundle.js` to TypeScript, one module each, with unit tests (Vitest, or Jest if the repo already uses it):

| Module | Port from bundle.js | Tests |
| --- | --- | --- |
| `random.ts` | `hash`, `rng` (mulberry32), `vnoise`, `seededRot` | same seed gives the same sequence; values stay in range |
| `torn.ts` | `TEAR`, `tearEdge`, `cutEdge`, `tornPair`, `tornClip`, `tornVars`, cache | deterministic per seed; `face` and `fiber` both start with `polygon(`; fibre depth ≤ face depth at every point; `edges:'b'` + `flush` gives top corners at `0px`; size buckets reuse the cache |
| `useTorn.ts` | `useSeed`, `useTorn` (ResizeObserver, 64px buckets) | re-renders only when the bucket changes |
| `pattern.ts` | `PALETTE`, `USER_COLORS`, `PATTERN_KINDS`, `patternMarkup`, `patternSVG`, plus a `PatternSpec` type | every kind returns valid SVG markup; IDs are unique per call |
| `dieCut.ts` | `stickerBorder`, `edgeRadius`, `dieCutPad`, `dieCut` (smooth / wobbly / torn, colour or pattern fill, torn lip) | output size = input + 2 × pad; border 0 gives no added pixels; use a canvas mock or `node-canvas`, or skip with a note if the test runner has no canvas |
| `scribble.ts` | `scribblePath` | deterministic |

Then the React primitives in `src/components/ui/`, following each `components/<Name>/README.md`:

- `Paper` (the wrapper is `.torn` with `--clip`, `--fclip` and `--fiber-tone`; the face is clipped)
- `Tape`, `Scribble` and `Divider`, `Icon` (copy the `IC` path data)
- `Button`, `Chip`, `ToggleGroup` (Radix ToggleGroup), `TextField` (Radix Label), `Slider` (Radix Slider), `ColorPicker` and `Swatch` (Radix RadioGroup; Popover for the popover variant)
- `Dialog` (Radix Dialog), `Toast` (Radix Toast), `Tooltip` (Radix Tooltip), `Avatar` and `AvatarMenu` (Radix DropdownMenu)
- `Loader` (typing, reel, skeleton), `EmptyState`, `Wordmark`, `Masthead`
- `Sticker`, `StickerTile`, `LassoCanvas` overlay styling (marching ants, §7)

Port the CSS from `components/bundle.css` into Tailwind-friendly CSS (a `@layer components` file, or utilities where it's natural). Keep the `.zf-torn::before` fibre-lip technique and the `--focus-trace` filter. **The Radix `asChild` target must be the torn wrapper**, so focus and ARIA land on the element that draws the ring.

Build a `/dev/design-system` route (dev builds only) that renders every primitive in every state, mirroring `design-system/components/*/preview.html`. Commit: `feat(ds): paper primitives and UI components`.

## 4. Restyle every screen

Follow `03-screens.md` exactly, at 390px (mobile) and 1280px (desktop). The layout switches at 760px.

1. **Masthead.** Peach band torn on the bottom edge only (`xl`, `flush`, measured). Wordmark, nav with a hand-drawn underline on the current item, and the avatar menu. Under 760px a menu button opens a torn dropdown. Desktop is sticky.
2. **Auth.** Log in, Sign up step 1, Sign up step 2 (avatar, "Add a photo", nickname), the password-reset Dialog, field and form errors, and button loading states. Use the sticker collage on desktop and the three-sticker strip on mobile.
3. **Home.** Hero scrap ("No. 01 · Sticker maker"), the sticker cluster, and "Recently cut" (or the "Soon" tape label if the book isn't there yet).
4. **Sticker maker dialog.** The empty, loading, error and lasso states with the Mode and Shape toggles and the Undo/Redo/Delete/Reset buttons. Step 2 is the **StickerEdgeStudio** (§6). Mobile is a full-bleed sheet.
5. **Sticker book.** Grid (5 columns desktop, 2 mobile), inline rename, delete with confirmation and an Undo toast, the detail Dialog (Edit edge, Rename, Download PNG), the empty state and skeleton loading. If the book does not exist yet, build the UI against a local mock store and mark it clearly in the plan.
6. **404.**

Copy rules (README §4): sentence case, verbs on buttons, no exclamation marks, no emoji. Keep the existing English and Chinese i18n keys and add new ones for any new strings in both languages.

Commit per screen.

## 5. Sticker export: screen equals file

- Replace the current border/export code with `dieCut()`. The UI preview and the downloaded PNG must both come from the **same** `dieCut` call, the preview at display size × devicePixelRatio (≤ 2) and the export at source resolution.
- The PNG is transparent, with the border baked in and **no shadow**.
- Persist with each sticker: `edge: { shape, scale, fill: PatternSpec }` and `seed`, so "Edit edge" can reproduce it.
- Move exports with a long side over 2000px to an `OffscreenCanvas` worker if that API is available. Throttle the live preview to one render per animation frame.

## 6. User customisation (new features)

1. **PatternEditor** (`components/PatternEditor/README.md`): the eight kinds, paper and ink colours (the 16 `USER_COLORS`), Size, Turn and Weight sliders, the 8 × 8 PixelGrid and the DoodlePad. It is a controlled component whose output is a `PatternSpec`.
2. **StickerEdgeStudio**: edge shape (smooth, wobbly or torn), edge width (0–160%, shown in px) and edge fill (PatternEditor), with a live `dieCut` preview. It is used as maker step 2 and from "Edit edge".
3. **TapeStudio**:
   - **Direction:** chips, plus a drag handle on the tape and arrow keys ±5° on the focused handle.
   - **Size and finish:** Length, Width and See-through sliders, and Torn / Cut / Pinked ends.
   - **Print:** a PatternEditor.
   - **My tape roll:** "Add to my tape roll" saves the tape here; tapping a saved tape loads it.

   Store `TapeSpec[]` per user. Use the existing persistence layer if there is one; otherwise use a typed local store with a TODO for the backend.
4. Data types are in `components/index.d.ts` and `02-signature-elements.md` §3 and §8.

Commit: `feat: pattern editor, sticker edge studio, tape studio`.

## 7. Verify (do not skip)

1. Typecheck, lint, unit tests and the production build must all pass.
2. **Playwright screenshots** of every screen and state at 390 × 844 and 1280 × 800, saved to `design-system/verification/`. Compare each one against the matching card in `design-system/gallery.html` (serve it with `npx serve design-system`) and fix any visible mismatch in layout, tone, tear, tape or type.
3. **Automated checks** (write them as tests or a script):
   - no computed `box-shadow` other than `none` on any element, and no `filter` containing a blurred `drop-shadow` (`drop-shadow(... Npx ...)` with a blur above 0);
   - no `border-radius` on UI chrome except avatar images and the photo (`radius-photo`);
   - axe-core with 0 serious or critical violations on each screen;
   - text contrast at least 4.5:1 for every text element, at least 3:1 for text 24px and up;
   - the string "Zoofus" never appears next to a tagline, and `<title>` follows `Zoofus · <page>`.
4. **Keyboard pass.** Tab through every screen and confirm the focus ring traces the torn shape. Radix dialogs trap focus and Esc closes them. The tape handle turns with the arrow keys. Pixel cells toggle with Space and Enter.
5. **Reduced motion.** With `prefers-reduced-motion: reduce`, there are no transitions, the marching ants freeze and the loaders are static.
6. **Bilingual.** Switch to Chinese and screenshot the auth, maker and book screens again. Check that the CJK text uses Xiaolai Mono SC (DevTools → Computed → Rendered fonts, or `document.fonts`).
7. **Export parity.** Export a sticker for each edge shape with a pattern fill, and diff it against the on-screen canvas (same seed, scaled). Small anti-aliasing differences are fine.

## 8. Finish

- Update `CLAUDE.md` with the snippet in `design-system/CLAUDE_SNIPPET.md`.
- Write `design-system/ADOPTION_REPORT.md` covering: what changed (files), which screens are done, the verification results (with links to the screenshots), deviations from the design system with reasons, and the **open questions** from `04-open-questions.md` that still need the owner. Also list any new ones you hit, especially the Xiaolai family name, the navy question, and pinked tape ends.
- Push the branch and open a PR if a remote is configured. Put the screenshots grid and the report summary in the PR description.

## If something is unclear

The order of authority is: the hard rules (§0) → `README.md` → the component READMEs → `02-signature-elements.md` → `bundle.js` behaviour → your judgement. When you make a call yourself, write it in `ADOPTION_REPORT.md` under "Decisions" and keep going.
