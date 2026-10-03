# Zoofus

A React + Firebase web app. Sign up or log in (email/password or Google), then use the **Image Lasso** tool: upload an image, select regions with a freehand lasso or rectangle/triangle/star shapes (with select and deselect modes), and preview the masked cut-out with an adjustable border color and width.

Stack: React 19, Vite 7, MUI 7, Redux Toolkit, react-router 7, Konva/react-konva, polygon-clipping, Less modules, Firebase 12 (Auth, Firestore, Storage, Analytics, Hosting).

## Setup
1. Node 20 or newer, then `npm install`.
2. Create a `.env` in the repo root (never commit it) with your Firebase web config:
   `VITE_APP_API_KEY`, `VITE_APP_AUTH_DOMAIN`, `VITE_APP_PROJECT_ID`, `VITE_APP_STORAGE_BUCKET`, `VITE_APP_MESSAGING_SENDER_ID`, `VITE_APP_APP_ID`, `VITE_APP_MEASUREMENT_ID`.

## Commands
| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server (http://localhost:5173) |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run deploy` | Build, then `firebase deploy` to Hosting |

## Project structure
- `src/main.jsx`, `src/App.jsx` – providers and routes (`/login`, `/signup`, `/`)
- `src/context/AuthContext.jsx` – Firebase Auth wrapper
- `src/store/` – Redux store and user profile thunks
- `src/services/firebase.js` – Firebase initialization
- `src/pages/` – Auth and Home pages
- `src/components/ImageLasso/` – the lasso tool (state hook, Konva preview, controls, masking)
- `src/components/auth/`, `src/components/navigation/` – forms and nav bar
- `src/utils/image.js` – image helpers

## Branches and releases
- `dev` is the development branch; all work lands here.
- `main` holds only tagged releases (`vX.Y.Z`), created by merging `dev`. See `CHANGELOG.md`.

## Deploy
Releases are deployed to Firebase Hosting (project `zoofus-48264`) from the tagged commit on `main`:
```bash
firebase login        # once
npm run deploy
```
