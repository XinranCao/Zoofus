# Zoofus

## Project summary

Zoofus is a React + Firebase web app. Users sign up / log in (email+password or Google), then use the **Image Lasso** tool on the Home page: upload an image, select regions with freehand lasso or rectangle/triangle/star shapes (select vs deselect), and preview the masked cut-out with an adjustable border.
Stack: React 19, Vite 7, MUI 7, Redux Toolkit, react-router 7, Konva/react-konva, polygon-clipping, react-color, Less modules, Firebase 12 (Auth, Firestore, Storage, Analytics, Hosting). Firebase project id: `zoofus-48264`.
Local runs need a `.env` with `VITE_APP_*` Firebase keys. Never read, print or commit it.

## Commands

- `npm install` / `npm ci` – install deps (Node 22, see `.nvmrc`)
- `npm run dev` – Vite dev server; `npm run build` – production build into `dist/`; `npm run preview`
- `npm run typecheck` (tsc, strict), `npm run lint` (ESLint), `npm run format` / `format:check` (Prettier)
- `npm test` – Vitest (jsdom) single run; `npm run test:watch`. Tests live next to code as `*.test.ts(x)`.
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
- `src/features/stickers/editor/` – the sticker maker
  - `domain/` pure, tested logic: `types.ts` (unified `Selection` model), `geometry.ts` (selection → polygon, ring joining), `mask.ts` (polygon-clipping: select union minus deselect, clipped to image), `render.ts` (canvas cut-out + border)
  - `store/editorStore.ts` – Zustand store per editor instance with undo/redo history (`EditorStoreProvider`, `useEditor`)
  - `components/` Konva canvas, shapes, controls, result panel; `StickerEditor.tsx` is the entry
  - `library/` saved stickers: `sticker.schema.ts`, `stickers.api.ts` (Firestore `users/{uid}/stickers/{id}` + Storage `{uid}/stickers/{id}.png`), `useStickers.ts`, `StickerBookPage.tsx`, `StickerPreviewDialog.tsx` (zoom/pan preview via `react-zoom-pan-pinch`)
- `firestore.rules`, `storage.rules`, `rules-tests/` – owner-only security rules and their emulator tests. **Deploying rules changes production: ask the user first** (`firebase deploy --only firestore:rules,storage`).
- `e2e/` – Playwright tests; `src/**/*.test.tsx` – Testing Library component tests
- `src/features/pages/` – collage page data model (schema, pure ops, API, hooks; no UI yet). `src/features/account/` – account page (export/delete), email verification banner
- `docs/app-check.md` – one-time App Check console setup
- `src/components/ErrorBoundary.tsx`, `src/pages/NotFoundPage.tsx` – error and 404 handling
- `src/pages/HomePage.tsx` – opens the editor in a dialog
- `docs/ui-style-brief.md` – brief for the UI redesign (Tailwind + Radix, hand-torn scrapbook style)

## Conventions

- Server data (Firebase) goes through TanStack Query hooks; Redux is gone. Editor state lives in the Zustand store, never in components.
- Keep geometry and mask logic in `domain/` as pure functions with unit tests; Konva/React code only renders and forwards events.
- Validate external data with zod schemas (env, Firestore docs, forms via react-hook-form + zod).
- UI is MUI for now and will be replaced by Tailwind + Radix in the redesign (issue #16): do not invest in new MUI-specific styling.
- Object URLs are revoked by the component that owns them (the editor owns the image URL).
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

1. On `dev`, with a clean tree: `git pull --ff-only`, `npm ci`, `npm run build` (and tests). Everything must pass.
2. Propose the version number (semver; current is in package.json) and confirm it with the user.
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

- **Cloud Storage needs the Blaze plan.** On the free Spark plan every upload (stickers, profile photos) fails with HTTP 402. The emulators do not enforce this, so tests pass regardless. Upgrade the project to Blaze (pay-as-you-go; the Always Free quota covers small use) and set a budget alert, see `docs/security-setup.md`.

- Do not upgrade `rollup` past 4.59.0 without checking: 4.64.0 made `vite build` hang (pinned via `overrides`). `@grpc/grpc-js` is overridden to ^1.14.5 to clear audit findings. `npm audit` is clean.
- Workflows that build the app need the repo secrets `VITE_APP_*` plus `FIREBASE_SERVICE_ACCOUNT_ZOOFUS_48264`.
- v0.4.0 milestone: UI redesign (#16, needs `docs/ui-style-brief.md` design guide) and i18n (#15).
- App Check needs the one-time console setup in `docs/app-check.md`; until then it is inactive.
- Not done yet: pinch-zoom on the canvas, HEIC support (non-Safari browsers), error monitoring (skipped by decision), thumbnails for pre-existing stickers.
- PR previews use the production backend; do not test destructive flows there.
- Freehand strokes can be moved with the arrow keys but have no resize handles (only shapes have a transformer).
