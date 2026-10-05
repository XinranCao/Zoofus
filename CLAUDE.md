# Zoofus

## Project summary

Zoofus is a React + Firebase web app. Users sign up / log in (email+password or Google), then use the **Image Lasso** tool on the Home page: upload an image, select regions with freehand lasso or rectangle/triangle/star shapes (select vs deselect), and preview the masked cut-out with an adjustable border.
Stack: React 19, Vite 7, Tailwind CSS v4 + Radix UI (design system in `design-system/`), react-router 7, Konva/react-konva, polygon-clipping, Zustand, TanStack Query, react-i18next (en, zh-CN), Firebase 12 (Auth, Firestore, Storage, Analytics, Hosting). Firebase project id: `zoofus-48264`.
Local runs need a `.env` with `VITE_APP_*` Firebase keys. Never read, print or commit it.

## Commands

- `npm install` / `npm ci` – install deps (Node 22, see `.nvmrc`)
- `npm run dev` – Vite dev server; `npm run build` – production build into `dist/`; `npm run preview`
- `npm run typecheck` (tsc, strict), `npm run lint` (ESLint), `npm run format` / `format:check` (Prettier)
- `npm test` – Vitest (jsdom) single run; `npm run test:watch`. Tests live next to code as `*.test.ts(x)`.
- `npm run test:noenv` – the unit tests as CI runs them, with no Firebase keys (your local `.env` hides this: a module that imports `src/lib/env.ts` or `firebase.ts` without a mock only fails in CI). Run it before a release.
- `npm run test:rules` – Firestore/Storage security rules tests against the local emulators (needs Java 17+; CI job `security-rules`)
- `npm run test:e2e` – Playwright end-to-end flow (sign up, cut, save, delete) against the emulators; uses your Chrome locally, Chromium in CI (job `e2e`)
- `npm run emulators` + `npm run dev:emulated` – local Firebase emulators (Auth, Firestore, Storage) and an app wired to them (`.env.emulator`). Prefer this for anything that writes data.
- `npm run check` – typecheck + lint + tests + build (run before every push)
- `npm run deploy` – manual build + `firebase deploy` (normally releases deploy from CI on a tag)
- CI (`.github/workflows/ci.yml`) runs typecheck, lint, format check, tests and build on pushes and PRs to `dev`/`main`.

## Architecture map

TypeScript (strict), path alias `@/` = `src/`. Feature-based layout; features own their UI, data access and tests.

- `src/main.tsx` – entry. `src/app/providers.tsx` (QueryClient, Router, Auth), `src/app/App.tsx` (lazy routes)
- `src/lib/` – cross-cutting code: `env.ts` (zod-validated `VITE_APP_*`), `firebase.ts` (auth/db/storage, guarded analytics), `image.ts` (compress, load, fit, scale)
- `src/components/layout/` – app chrome: `NavBar`, `PageContainer`
- `src/features/auth/` – `AuthProvider` + `useAuth` (Firebase Auth wrapper), `ProtectedRoute`, `auth.schema.ts` (zod), `components/` forms, `pages/` Login and SignUp
- `src/features/profile/` – `profile.schema.ts` (zod), `profile.api.ts` (Firestore `users/{uid}` + Storage `{uid}/profile/profile_pic/`), `useProfile.ts` (TanStack Query hooks)
- `src/features/stickers/editor/` – the sticker maker (`domain/outline.ts`: the lasso outline kept as text with each sticker, from which "Edit edge" rebuilds the cut-out; no second picture is stored any more)
  - `domain/` pure, tested logic: `types.ts` (unified `Selection` model), `geometry.ts` (selection → polygon, ring joining), `mask.ts` (polygon-clipping: select union minus deselect, clipped to image), `render.ts` (canvas cut-out + border)
  - `store/editorStore.ts` – Zustand store per editor instance with undo/redo history (`EditorStoreProvider`, `useEditor`)
  - `components/` Konva canvas, shapes, controls, result panel; `StickerEditor.tsx` is the entry
  - `library/` saved stickers: `sticker.schema.ts`, `stickers.api.ts` (Firestore `users/{uid}/stickers/{id}` + Storage `{uid}/stickers/{id}.png`), `useStickers.ts`, `StickerBookPage.tsx`, `StickerPreviewDialog.tsx` (zoom/pan preview via `react-zoom-pan-pinch`)
- `firestore.rules`, `storage.rules`, `rules-tests/` – owner-only security rules and their emulator tests. Deploying rules changes production. They go out with a release, first, with `npx firebase-tools@14 deploy --only firestore:rules,storage --project zoofus-48264` (the owner has pre-approved this for every release; outside a release, ask).
- `e2e/` – Playwright tests; `src/**/*.test.tsx` – Testing Library component tests
- `src/features/pages/` – collage page data model (schema, pure ops, API, hooks; no UI yet). `src/features/account/` – account page (export/delete), email verification banner
- `docs/app-check.md` – one-time App Check console setup. `docs/debugging.md` – how to debug in production and the emulators (symptom → tool; error codes; App Check playbook). `src/lib/diagnostics.ts` (flight recorder: recent errors, Analytics `app_error` counts), `src/lib/healthChecks.ts` and `src/pages/DiagnosticsPage.tsx` behind `features/admin/ManagerGate.tsx` (project managers only: the e-mail list is `isManager()` in `firestore.rules`, see docs/debugging.md) (`/diagnostics`: App Check token, Firestore, Storage checks and a copyable report; English only on purpose, a developer tool)
- `src/components/ErrorBoundary.tsx`, `src/pages/NotFoundPage.tsx` – error and 404 handling
- `src/features/library/` (tabs), `tape/` (tape studio + page), `journal/` (autosave interval in `autosave.ts` (60 s, throttled, not reset by each edit); the picture for a thumbnail or PNG is drawn from the canvas layers into a separate canvas, so saving never touches the page being edited; page model in `journal.schema.ts`, ops with inverses in `ops.ts`, store, Konva studio), `collections/`, `social/` (friends, friend codes, sharing, inbox), `together/` (workspaces: live items, shelf, presence, a page thumbnail kept in the workspace doc, `saveCopy` with a thumbnail). Library tiles (sticker, tape, journal, folder) show the name above the picture and the same hover actions; tapes can be edited in place (`NewTapeDialog` with `edit`). Data model in `docs/data-model.md`. Journal items are one compact doc; workspace items are one doc per object.
- `src/pages/HomePage.tsx` – opens the editor in a dialog
- `design-system/` – the Zoofus design system (reference docs and code, never imported); `ADOPTION_PLAN.md`, `ADOPTION_REPORT.md`, `verification/` screenshots
- `src/paper/` – ported paper primitives (torn clip pairs, patterns, dieCut, renderSticker) with tests; `src/styles/` – Tailwind theme, tokens, components.css; `src/components/ui/` – Radix-based UI kit, gallery at `/dev/design-system` (dev only); `src/i18n/` – locales; `src/features/tape/` – tape studio (`/tape`)
- `e2e/design-system.spec.ts` – all 23 screen states at 390 and 1280px in English, Chinese and reduced motion, with axe, flat/no-radius, contrast, torn-edge, layout and CJK-font checks (`e2e/support/ds-checks.ts`); `interaction`, `lasso`, `performance`, `storage-cleanup` specs; `gallery-compare.spec.ts` (`DS_GALLERY=1`)
- `src/lib/cjkFonts.ts` – the Chinese font stylesheet is loaded only when Chinese is on screen; `src/components/ui/GoogleButton.tsx` – Google's own button spec, the one deliberate exception to the torn look
- `RELEASE_CHECKLIST.md` – deploy commands, rules changes, smoke test, rollback

## Conventions

- Shapes in the sticker maker are drawn by dragging on the photo (no "Add shape" button); Space adds a default one from the keyboard. Saved data is read leniently (`patternSpecSchema` drops what it can't use; the stickers and tapes lists skip unreadable documents), so an older document can never make a list fail.
- A dialog never grows past the screen: `Dialog` pins the title and the actions and scrolls only `.zf-dialog__scroll` (one scrolling part; the page behind does not scroll). Put long content in the dialog's children, never in its own scroller.
- Server data (Firebase) goes through TanStack Query hooks; Redux and MUI are gone. Editor state lives in the Zustand store, never in components.
- Keep geometry and mask logic in `domain/` as pure functions with unit tests; Konva/React code only renders and forwards events.
- Validate external data with zod schemas (env, Firestore docs, forms via react-hook-form + zod).
- All user-facing copy goes through i18n (`src/i18n/locales/en.ts` and `zh.ts`); add keys to both.
- Object URLs are revoked by the component that owns them (the editor owns the image URL).
- Keyboard access: after a route change focus moves to the page `h1` (`components/layout/useRouteFocus.ts`; the skip link focuses `#main`); a `Dialog` returns focus to its opener; groups of many small controls (the pixel grid) are one tab stop with arrow keys; `e2e/focus-ring.spec.ts` checks that every control shows a focus indicator of at least 3:1, `e2e/a11y-names.spec.ts` that controls have names. `forced-colors` gets the system ring.
- Fix `useEffect` setState lint errors by deriving state, not by disabling the rule.

## Git workflow

- `dev` is the only development branch. Commit and push all work to `dev`. No feature branches.
- `main` is release-only. Never commit, push, or merge to `main` except during a release the user explicitly asked for.
- Before starting a task: confirm `git branch --show-current` is `dev` and run `git pull --ff-only`.
- After each finished task: run `npm run build` (and tests once they exist). If they pass, commit and `git push origin dev`.
- Commit message style: `FEAT:` / `FIX:` / `UPDATE:` / `STYLE:` / `CLEAN:` / `SETUP:` / `CHORE:` / `RELEASE:` + short imperative summary, e.g. `FEAT: add export button for masked image`.
- A Stop hook auto-commits leftover changes on `dev` as `WIP: auto-save …` and pushes them. Prefer making your own descriptive commit before ending a turn.
- Never commit `.env`, service-account JSON, or any secret. Never force-push.
- Work from `@claude` on GitHub arrives as PRs into `dev`. The user reviews and merges them.

## Release process (only when the user says "release" / "cut a version")

**Standing permission.** When the user says to release (or "I give you permission to release"), that covers the whole process below, including merging to `main`, pushing the tag, deploying the Firestore/Storage rules first when they changed, and the CI deploy. Do not ask again at each step. Only stop if something fails, or if the version to use is genuinely unclear (otherwise pick the semver bump yourself: features = minor, fixes only = patch, breaking = major) and say which you picked.

**Docs first.** Before every release, bring the docs up to date with what is actually implemented: `README.md` (features, commands, structure), `CLAUDE.md` (architecture map, conventions, backlog), `docs/data-model.md` (collections and fields), `RELEASE_CHECKLIST.md` and any other file that describes behaviour that changed. Check them against the code, not against memory, and commit the updates with the release.

1. On `dev`, with a clean tree: `git pull --ff-only`, `npm ci`, `npm run build` (and tests). Everything must pass.
2. Choose the version number (semver; current is in package.json) and state it. Ask only if the user has not given standing permission to release.
   2b. Update the docs (see "Docs first" above): README, CLAUDE.md, docs/data-model.md and any file that no longer matches the code.
3. Update `CHANGELOG.md`: a new `## vX.Y.Z – YYYY-MM-DD` section summarizing changes since the last tag (`git log <last-tag>..dev --oneline`, or since the first commit if there is no tag). Group them as Features / Fixes / Other, and skip WIP auto-save commits.
4. `npm version X.Y.Z --no-git-tag-version`, then commit `RELEASE: vX.Y.Z` on `dev` and push `dev`.
5. `git switch main && git pull --ff-only && git merge --no-ff dev -m "RELEASE: vX.Y.Z"`
6. `git tag -a vX.Y.Z -m "Zoofus vX.Y.Z"`, then `git push origin main && git push origin vX.Y.Z`
7. Pushing the tag triggers `.github/workflows/release.yml`, which verifies the tag is on `main` and matches `package.json`, runs tests + build, **deploys to Firebase Hosting (live)** and creates the GitHub Release from the `CHANGELOG.md` section. Watch it with `gh run watch`, then check https://zoofus-48264.web.app loads. Every tag is deployed this way.
8. If the workflow fails, fix forward on `dev` and release a patch; as a last resort deploy manually from the tagged commit with `npm run deploy` (needs local `.env`; user approves).
9. `git switch dev`.

- `git log --first-parent main --oneline` lists the releases.

## Working from GitHub

- Mention `@claude` in an issue or PR comment to have Claude work on it in GitHub Actions (`.github/workflows/claude.yml`, auth secret `CLAUDE_CODE_OAUTH_TOKEN`).
- Claude opens PRs into `dev`, and follows this same `CLAUDE.md`.
- `@claude` never merges to `main` or tags releases. Only the human-pushed `vX.Y.Z` tag triggers `release.yml` (deploy + GitHub Release).

## Repository protection

`dev` and `main` require the CI checks `build-and-test`, `security-rules` and `e2e`, and block force-push and deletion. Admins (the owner) can still push directly, which the auto-save hook and the release process rely on. To rewrite history on `dev`, lift the protection temporarily (`gh api -X DELETE repos/XinranCao/Zoofus/branches/dev/protection`), then restore it.

## Image compression policy

Stored images are compressed on save by `encodeWithin` + `COMPRESSION` in `src/lib/image.ts`: stickers max 1,280 px WebP (quality 0.82, floor 0.6, 400 KB target, PNG fallback where the browser cannot encode WebP), profile photos 512 px JPEG (no separate thumbnails: the gallery shows the full sticker, lazy-loaded). Editing keeps up to 2,048 px; "Download PNG" is the full-quality export. `storage.rules` caps uploads at 2 MB, which is the safety net, not the target. Change limits in one place (`COMPRESSION`) and keep the rules in step.

## Known issues / backlog

- Cloud Storage needs the Blaze plan (free Spark plan uploads fail with HTTP 402). Done: the project is on Blaze with a budget alert; see `docs/security-setup.md`. The emulators do not enforce plans, so tests pass regardless.

- Do not upgrade `rollup` past 4.59.0 without checking: 4.64.0 made `vite build` hang (pinned via `overrides`). `@grpc/grpc-js` is overridden to ^1.14.5 to clear audit findings. `npm audit` is clean.
- Workflows that build the app need the repo secrets `VITE_APP_*` plus `FIREBASE_SERVICE_ACCOUNT_ZOOFUS_48264`.
- The redesign (#16) and i18n (#15) shipped in v0.4.0. The design system lives in `design-system/` (reference, not imported); `RELEASE_CHECKLIST.md` is the release runbook.
- App Check, the budget alert and the Auth restrictions are set up and enforced in the consoles (`docs/app-check.md`, `docs/security-setup.md`). Local dev against the real backend needs the debug token in `.env.development.local`.
- Not done yet: pinch-zoom on the canvas, HEIC support (non-Safari browsers), full error monitoring (only the light `app_error` Analytics counts and `/diagnostics` exist, by decision), thumbnails for pre-existing stickers.
- PR previews use the production backend; do not test destructive flows there.
- Freehand strokes can be moved with the arrow keys but have no resize handles (only shapes have a transformer).

## Design system (Zoofus)

- UI follows `design-system/` — read `design-system/README.md` first, then the component's `design-system/components/<Name>/README.md`.
- Hard rules: one "Zoofus" wordmark, no tagline · flat, no shadows · every container is a seeded torn polygon pair (`src/paper/torn.ts`), no border-radius/borders on chrome · AA text contrast using the pairs in `design-system/01-tokens.md` · Special Elite + Courier Prime, Chinese in Xiaolai Mono SC · light theme only · reduced-motion respected · focus ring traced around the tear.
- Tokens live in `src/styles/theme.css` (Tailwind v4 `@theme`); never hard-code hex values in components.
- Sticker preview and PNG export both come from `dieCut()` (`src/paper/dieCut.ts`); never add a shadow to stickers.
- Tape and sticker-edge prints use `PatternSpec` (`src/paper/pattern.ts`); user colours are the 16 `USER_COLORS`.
- Visual reference: `npx serve design-system` → `gallery.html`.
