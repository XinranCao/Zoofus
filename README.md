# Zoofus

**Zoofus is a scrapbook for the web.** Cut stickers out of your photos, make washi tape, lay them on journal pages (手账), keep everything in collections, share with friends, and make a page together in real time. It looks hand-made on purpose: torn paper, tape, die-cut stickers, in English and 中文.

## What you can do

- **Stickers.** Upload a photo and draw around the part you want (freehand lasso, or drag out a rectangle, triangle or star; select and deselect). Choose the edge (smooth, wobbly, torn), its width and a print, give it a name, then save it. "Edit edge" redoes it later; "Download PNG" exports it.
- **Tapes.** Turn, size and print your own tape (stripes, dots, gingham, pixels you paint by dragging, a doodle, a plain colour). Four starter tapes come with the app. Change a tape's looks or name any time (Edit on hover).
- **Journals (手账).** A page studio: pick a size, a paper (notebook, newsprint, magazine; the last two are textures only) and a style and a colour; place stickers and tapes freely (move, rotate, stretch any way), add text in a drop-down of common, Chinese and handwriting fonts, draw with pen, pencil, crayon and more, rub out just part of a line, undo and redo, export a PNG. A status next to the title says "All changes saved", "Saving in a moment" or "Saving…" (autosave runs at most once a minute and a new title is kept a moment after you stop typing; **Save** keeps it at once).
- **Collections.** Your own folders of stickers, tapes and journals, with bulk select, add, remove and delete everywhere.
- **Friends.** Add friends with a friend code, give them nicknames only you see, and share stickers, tapes and journals. What a friend shares arrives in "Shared with you" and you can keep it.
- **Together.** Start a shared page, invite friends, choose which of your stickers and tapes to add to a shelf everyone can use, edit at the same time (you see who is here), and each save your own copy. Edits reach everyone at once; **Save** refreshes the page's picture in the list (also done for you at most once a minute), and **Save a copy** keeps your own journal. The list and your copies show the page as it looks, not bare paper.
- **Profile.** A nickname chosen at sign-up (suggested from your email), and a profile picture made with the sticker maker (it keeps its sticker shape in the navigation bar). The language (English or 中文) is chosen in the account menu; the Account page says in plain words what is kept and who can see it.
- **Keyboard and screen readers.** The sticker cutter works without a mouse: Enter gives a starting selection, arrows move it, Shift plus arrows resize it, Enter again cuts it, and a live region says what is selected (there is also "Use the whole photo"). The journal editor has a heading and a readable list of what is on the page. Focus moves to the page heading after each navigation and back to the opener when a dialog closes (a dialog opened from the Make menu returns to the Make button; it starts on its first field, else its title, and Close is the last stop), controls have names and visible focus rings (also in forced-colours mode), and the tape dialog and pixel grid take few tab stops.

## How it is built

React 19, Vite 7, TypeScript (strict), Tailwind CSS v4 with Radix UI, react-router 7, TanStack Query, Zustand (editor stores with undo/redo), Konva/react-konva (canvases), polygon-clipping, react-i18next, zod, Firebase 12 (Auth, Firestore, Storage, App Check, Analytics, Hosting). The data model and the security rules are described in [`docs/data-model.md`](docs/data-model.md); the visual language in [`design-system/`](design-system/). When something fails, open `/diagnostics` in the app and read [`docs/debugging.md`](docs/debugging.md).

## Setup

1. Node 22 (see `.nvmrc`; Vite needs 20.19+) and Java 17+ (for the emulators), then `npm install`. The Firebase CLI is run through `npx`, so no global install is needed.
2. Create a `.env` in the repo root (never commit it) with your Firebase web config:
   `VITE_APP_API_KEY`, `VITE_APP_AUTH_DOMAIN`, `VITE_APP_PROJECT_ID`, `VITE_APP_STORAGE_BUCKET`, `VITE_APP_MESSAGING_SENDER_ID`, `VITE_APP_APP_ID`, `VITE_APP_MEASUREMENT_ID`.

## Environments

| Environment          | Backend                                                             | How                                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local (emulated)     | Firebase emulators: Auth, Firestore, Storage; no real data touched  | `npm run emulators` in one terminal, `npm run dev:emulated` in another. Emulator UI at http://localhost:4000. Data persists in `.emulator-data/` (git-ignored). |
| Local (real backend) | Production Firebase project `zoofus-48264`                          | `.env` from `.env.example`, then `npm run dev`                                                                                                                  |
| PR preview           | Production Firebase project (a preview channel only hosts the site) | Automatic on every PR                                                                                                                                           |
| Production           | Firebase Hosting live channel                                       | Tag `vX.Y.Z` on `main` (release workflow)                                                                                                                       |

Use the emulated setup for anything that writes data. PR previews talk to the production backend.

## Commands

| Command                                       | What it does                                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`                                 | Vite dev server (http://localhost:5173)                                                                                  |
| `npm run build`                               | Production build into `dist/`                                                                                            |
| `npm run typecheck` / `lint` / `format:check` | TypeScript (strict), ESLint, Prettier                                                                                    |
| `npm test`                                    | Vitest suite                                                                                                             |
| `npm run check`                               | Typecheck, lint, tests and build together                                                                                |
| `npm run preview`                             | Serve the production build                                                                                               |
| `npm run test:rules`                          | Firestore and Storage rules tests (emulators, Java)                                                                      |
| `npm run test:coverage`                       | Unit tests with a coverage summary (no threshold yet)                                                                    |
| `npm run emulators:lan`                       | The emulators open to your network, to try the app from a second device (the default emulators listen on 127.0.0.1 only) |
| `npm run test:e2e`                            | Playwright end-to-end tests against the emulators                                                                        |

## Project structure

TypeScript with an `@/` alias for `src/`, organised by feature:

- `src/app/` – providers and routes
- `src/lib/` – env validation, Firebase init, image helpers, `trustedUrl.ts` (the app only follows picture links to its own Storage bucket or `data:` images)
- `src/features/auth/`, `profile/`, `account/` – sign in / up, profile card, account export and deletion
- `src/features/stickers/` – the sticker maker (`editor/`: pure geometry and mask logic, store, Konva canvas) and the library
- `src/features/tape/` – tape studio and the tape collection page
- `src/features/journal/` – the journal model (compact items, operations with inverses for undo), the studio, the gallery
- `src/features/collections/` – user collections and bulk management
- `src/features/social/` – friends, friend codes, sharing and the inbox
- `src/features/together/` – shared pages (workspaces): live items, shelf, presence, save a copy
- `src/paper/` – the torn-paper drawing code shared by the UI and the exports
- `src/components/ui/`, `src/components/layout/` – design-system components and the app chrome
- `firebase.json` – hosting rewrites and headers (security headers, an enforcing Content-Security-Policy, a year-long cache for `/assets/**`; `firebase.lan.json` is the same emulator setup opened to the network)
- `rules-tests/`, `e2e/` – security rules tests and Playwright flows (including `csp` on a production build, which also runs the friends, Together and Google sign-in flows with the policy enforcing, `focus-ring`, `a11y-names`, `auth-layout`, `cutter-keyboard`, `untrusted-pictures` checks)

## Branches and releases

- `dev` is the development branch; all work lands here.
- `main` holds only tagged releases (`vX.Y.Z`), created by merging `dev`. See `CHANGELOG.md`.

## CI/CD

- **CI** (`ci.yml`): `npm ci`, `npm test`, `npm run build` on every push and PR to `dev`/`main`.
- **PR previews** (`firebase-hosting-pull-request.yml`): each PR gets a Firebase Hosting preview URL.
- **Release** (`release.yml`): pushing a tag `vX.Y.Z` on `main` runs tests, builds, deploys to Firebase Hosting (live) and creates the GitHub Release from `CHANGELOG.md`.
- Required GitHub secrets: `FIREBASE_SERVICE_ACCOUNT_ZOOFUS_48264`, the `VITE_APP_*` Firebase config values, and `CLAUDE_CODE_OAUTH_TOKEN` (for `@claude`).

## Deploy

Normally automatic on tag (see above). Manual fallback from the tagged commit on `main`:

```bash
firebase login        # once
npm run deploy
```
