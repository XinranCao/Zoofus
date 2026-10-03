# Changelog

## Unreleased

### Features

- Click a sticker in My Stickers to preview it full size in a pop-up: zoom with the buttons, mouse wheel, double click or pinch, drag to move around, Escape to close. Transparent areas show on a checkerboard.
- Saved stickers are compressed: scaled to at most 1,280 px and stored as WebP (quality 82, stepping down to 60 if needed, 400 KB target) with a 256 px thumbnail, so each sticker is typically under 100 KB. "Download PNG" is still full quality.
- Profile photos are scaled to 512 px and compressed to JPEG before upload (they used to keep their full dimensions).

### Other

- Storage rules now accept WebP or PNG stickers up to 2 MB and profile photos up to 2 MB (was 10 MB and 5 MB). Deploy the rules after releasing this version.

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
