# Zoofus

A React + Firebase web app. Sign up or log in (email/password or Google), then use the **Image Lasso** tool: upload an image, select regions with a freehand lasso or rectangle/triangle/star shapes (with select and deselect modes), and preview the masked cut-out with an adjustable border color and width.

Stack: React 19, Vite 7, Tailwind CSS v4, Radix UI, react-router 7, Konva/react-konva, polygon-clipping, react-i18next, Firebase 12 (Auth, Firestore, Storage, Analytics, Hosting).

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

| Command                                       | What it does                              |
| --------------------------------------------- | ----------------------------------------- |
| `npm run dev`                                 | Vite dev server (http://localhost:5173)   |
| `npm run build`                               | Production build into `dist/`             |
| `npm run typecheck` / `lint` / `format:check` | TypeScript (strict), ESLint, Prettier     |
| `npm test`                                    | Vitest suite                              |
| `npm run check`                               | Typecheck, lint, tests and build together |
| `npm run preview`                             | Serve the production build                |

## Project structure

TypeScript with an `@/` alias for `src/`, organised by feature:

- `src/app/` – providers and routes
- `src/lib/` – env validation, Firebase init, image helpers
- `src/features/auth/` – sign in / sign up, auth provider
- `src/features/profile/` – user profile data (TanStack Query + Firestore/Storage)
- `src/features/stickers/editor/` – the sticker maker: pure geometry and mask logic (`domain/`), Zustand store with undo/redo, Konva canvas
- `src/components/layout/`, `src/pages/` – app chrome and pages

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
