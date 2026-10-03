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
