# Changelog

## Unreleased

### Features

- Sticker book: save a cut-out to your account (Firestore + Storage), list and delete it on the new My Stickers page.
- Real undo and redo in the sticker editor (the old "Redo" only reset everything), plus Clear.

### Other

- Review fixes: error screen now clears on navigation; account and sticker deletion no longer fail on missing files; failed saves clean up uploaded files; query cache cleared on sign-out; faster border slider; sign-up uses new-password autocomplete; App Check initialised first; test scripts use a pinned `npx firebase-tools`.
- Testing: Testing Library component tests and a Playwright end-to-end flow on the emulators, both in CI.
- Account page (download data, delete account), email verification banner, App Check wiring, per-account sticker limits, collage page data model, editor keyboard shortcuts and touch handling.
- Local emulator environment (`npm run emulators`, `npm run dev:emulated`); `.env.example`; environments documented.
- Image pipeline: EXIF rotation, downscaling of large photos, friendly errors for unsupported files, sticker thumbnails, rename stickers.
- Firestore and Storage security rules (owner-only, validated fields, size and type limits) with emulator tests and a CI job. Not deployed yet.
- Error boundary and a 404 page.
- Migrated to TypeScript (strict) with ESLint, Prettier, typecheck and lint in CI.
- Feature-based structure with an `@/` alias; Redux replaced by TanStack Query (server data) and Zustand (editor state).
- Rebuilt the sticker editor around a unified selection model with a pure, unit-tested mask engine.
- Forms use react-hook-form + zod; environment variables are validated at startup.
- UI style brief for the redesign in `docs/ui-style-brief.md`.

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
