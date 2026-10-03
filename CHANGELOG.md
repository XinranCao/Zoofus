# Changelog

## Unreleased

### Features
- Download the masked cut-out as a PNG from the Image Lasso confirm view.

### Fixes
- Profile setup now awaits the upload and surfaces errors instead of navigating early and swallowing failures.
- Firebase Analytics is only initialized in supported browsers.
- Applied npm audit fixes (17 -> 4 findings); pinned rollup 4.59.0.

### Other
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
