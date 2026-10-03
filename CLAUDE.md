# Zoofus

## Project summary
Zoofus is a React + Firebase web app. Users sign up / log in (email+password or Google), then use the **Image Lasso** tool on the Home page: upload an image, select regions with freehand lasso or rectangle/triangle/star shapes (select vs deselect), and preview the masked cut-out with an adjustable border.
Stack: React 19, Vite 7, MUI 7, Redux Toolkit, react-router 7, Konva/react-konva, polygon-clipping, react-color, Less modules, Firebase 12 (Auth, Firestore, Storage, Analytics, Hosting). Firebase project id: `zoofus-48264`.
Local runs need a `.env` with `VITE_APP_*` Firebase keys. Never read, print or commit it.

## Commands
- `npm install` / `npm ci` – install deps
- `npm run dev` – Vite dev server
- `npm run build` – production build into `dist/`
- `npm run preview` – serve the built app
- `npm run deploy` – build, then `firebase deploy` to Hosting (needs user approval)
- Tests: no working runner yet (`npm test` runs the invalid `vite test`). Once Vitest is set up, use `npx vitest run`.

## Architecture map
- `src/main.jsx` – providers: Redux `Provider` > `BrowserRouter` > `AuthProvider` > `App`
- `src/App.jsx` – routes: `/login`, `/signup`, `/` (behind `ProtectedRoute`)
- `src/context/AuthContext.jsx` – Firebase Auth wrapper (`useAuth`): signup/login/Google/logout/reset, `updateProfile`
- `src/store/userSlice.js` – Redux thunks for the Firestore `users/{uid}` profile and Storage upload to `{uid}/profile/profile_pic/`
- `src/services/firebase.js` – Firebase init (auth, db, storage, analytics) from `import.meta.env.VITE_APP_*`
- `src/pages/Auth/*` – Login and two-step SignUp pages; `src/components/auth/*` – forms and password-reset dialog
- `src/pages/Home/Home.jsx` – opens the Image Lasso dialog
- `src/components/ImageLasso/*` – the lasso tool: `ImageLassoPanel` (dialog), `PreviewBox` (Konva stage), `LassoControls`, `ShapeSelector`, `MaskedImage` (polygon-clipping union/difference + border), `hooks/` (state, drawing, transform), `shapeHandler/`, `utils/lassoUtils.js`
- `src/components/navigation/NavBar.jsx` – top bar with avatar and menu
- `src/utils/image.js` – `compressImage`, `useImageCustom`, `scalePoints`, `getFitSize`
- `.github/workflows/` – Firebase Hosting preview on PRs (plus the Claude workflow once added)
- Local-only (git-ignored): `.claude/` (settings + hooks) and `CLAUDE_SETUP_TASK.md`. `CLAUDE.md` itself is tracked so `@claude` on GitHub can read it.

## Conventions
- React function components with hooks; MUI components styled via the `sx` prop; `*.module.less` CSS modules for layout.
- Redux Toolkit thunks (`createAsyncThunk`) for Firebase I/O.
- ImageLasso state lives in `useImageLassoState` and is shared through `ImageLassoContext`.

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
7. `gh release create vX.Y.Z --title "Zoofus vX.Y.Z" --notes-file <the changelog section>`
8. **Deploy to Firebase on every release.** While on the tagged commit on `main` (needs `.env` locally), run `npm run deploy` (user approves the prompt), then check the Hosting URL loads. Do this for every new tag.
9. `git switch dev`.
- `git log --first-parent main --oneline` lists the releases.

## Working from GitHub
- Mention `@claude` in an issue or PR comment to have Claude work on it in GitHub Actions (`.github/workflows/claude.yml`, auth secret `CLAUDE_CODE_OAUTH_TOKEN`).
- Claude opens PRs into `dev`, and follows this same `CLAUDE.md`.
- Releases to `main` and Firebase deploys are never done from GitHub Actions.

## Known issues / backlog
Confirmed in the Phase 4 health check (build passes; dev server starts; `npm audit` reports 17 vulns):
- **Tests broken:** `npm test` runs `vite test` (not a command). No Vitest/jsdom installed. `src/App.test.js` is a CRA test looking for "learn react"; `src/setupTests.js` is Jest-style. Testing-library deps are present but unused.
- **Profile update bug:** `AuthContext.updateProfile` (`src/context/AuthContext.jsx`) dispatches `updateUserProfile` without `await`/`unwrap`; `userSlice.js` has no `rejected` case. `SignUpPage.handleStep2` therefore navigates before the upload finishes and upload errors are silently swallowed.
- **Analytics at import:** `src/services/firebase.js` calls `getAnalytics(app)` unguarded (no `isSupported()`), and the `analytics`/`googleProvider` values are unused.
- **CRA leftovers:** `package.json` `eslintConfig` (ESLint not installed) and `browserslist`; `src/reportWebVitals.js` + call in `src/main.jsx` (`web-vitals` dep); unused `src/App.css` and `src/logo.svg`; `public/manifest.json` (CRA placeholder, not linked from `index.html`); `README.md` was CRA boilerplate (rewritten).
- **No export:** the masked image can't be saved/downloaded yet (`MaskedImage.jsx`).
- **CI/deploy:** no build/test check on pushes to `dev`; deploys are manual (`npm run deploy`). PR preview workflow needs the repo secret `FIREBASE_SERVICE_ACCOUNT_ZOOFUS_48264`, which is missing.
- **Other:** single 1.5 MB JS bundle (Vite chunk warning); `npm audit` vulnerabilities; "Redo" button actually resets everything; a few commented-out blocks.
- Not an issue: `UndoIcon` in `LassoControls.jsx` is used.
