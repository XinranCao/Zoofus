# Design system adoption plan

Written before any code changed. Source of truth: `README.md` → `01-tokens.md` → `02-signature-elements.md` → `03-screens.md` → `04-open-questions.md` → `components/*/README.md`. `components/bundle.js` / `bundle.css` are reference code that is ported, never imported.

## 0. Repo survey

| Area | Today | After adoption |
| --- | --- | --- |
| Entry | `src/main.tsx` renders `<Providers><App/></Providers>` | same, plus fonts, `styles/index.css`, i18n init |
| Router | `src/app/App.tsx`: lazy routes `/login`, `/signup`, `/`, `/stickers`, `/account`, `*`; `ProtectedRoute` | same routes; add `/tape`, dev-only `/dev/design-system`; shell = `Masthead` + toasts |
| Global CSS | `src/index.css` (body font, `#app` sizes) | `src/styles/index.css` → `@import "tailwindcss"`, `theme.css`, `tokens.css`, `components.css` (ground, torn, focus, ants) |
| Styling | MUI 7 + Emotion + Less modules | Tailwind v4 + Radix UI; MUI, Emotion, Less, react-color, react-icons removed |
| Dialogs, forms, menus | MUI (`Dialog`, `TextField`, `ToggleButtonGroup`, `Slider`, `Popover`, `Menu`) | Radix primitives wrapped as `src/components/ui/*` |
| Sticker canvas | `react-konva` Stage/Layer/Line/shapes/Transformer in `features/stickers/editor/components/EditorCanvas.tsx` + `SelectionShape.tsx` | Keep Konva for interaction (drag/resize/rotate); restyle selection strokes to the three-layer marching ants, dim outside, first-point ring |
| Export | `domain/render.ts` `renderCutout` (clip + stroked border) → `encodeWithin` (WebP) in `useStickers.ts`; PNG download in `ResultPanel.tsx` | `src/paper/dieCut.ts`; preview, saved file and PNG all come from the same call |
| Persistence | Firestore `users/{uid}/stickers/{id}`, Storage `{uid}/stickers/*`, rules + tests | add `edge` + `seed` to sticker docs; add `users/{uid}/tapes/{id}` (`TapeSpec`); rules + rules tests |
| i18n | none (strings hard-coded in English) | `react-i18next`, `en` + `zh-CN`, `<html lang>` follows locale |
| Tests | Vitest + Testing Library, Playwright e2e (emulators), rules tests | + `src/paper/*.test.ts`, UI component tests, design-system verification (screenshots, axe, contrast, no-shadow) |

## 1. Component and screen mapping

| Existing | Path | Design-system counterpart |
| --- | --- | --- |
| NavBar | `src/components/layout/NavBar.tsx` (+ `.module.less`) | `Masthead` + `Wordmark` + `Avatar`/`AvatarMenu` + mobile menu (Radix DropdownMenu) |
| PageContainer | `src/components/layout/PageContainer.tsx` | `Page` layout (ground, 1184px container, gutters) |
| ErrorBoundary | `src/components/ErrorBoundary.tsx` | `EmptyState` + `Button` |
| NotFoundPage | `src/pages/NotFoundPage.tsx` | `NotFoundPage` (giant apricot 404 + `EmptyState`) |
| LoginPage / SignUpPage | `src/features/auth/pages/*` | `AuthPage` (collage + taped `Paper` card), steps 1 and 2 |
| AuthForm | `src/features/auth/components/AuthForm.tsx` | `TextField`, `Button`, `Divider`, `Toast` for errors |
| PasswordResetDialog | `src/features/auth/components/PasswordResetDialog.tsx` | `Dialog` (420) + `TextField` + success `Toast` |
| ProfileSetupForm | `src/features/auth/components/ProfileSetupForm.tsx` | sign-up step 2: 72px `Avatar`, "Add a photo", nickname `TextField` |
| HomePage | `src/pages/HomePage.tsx` | `HomePage`: hero `Paper`, sticker cluster, "Recently cut" `StickerTile` row from real stickers |
| StickerEditor (dialog + steps) | `src/features/stickers/editor/StickerEditor.tsx`, `HomePage` dialog | `StickerMakerPage`: `Dialog` 1040 (full-bleed sheet on mobile), step 1 `LassoCanvas`, step 2 `StickerEdgeStudio` |
| EditorControls | `.../components/EditorControls.tsx` | `ToggleGroup` (Mode, Shape), quiet `Button`s with `Tooltip` shortcuts |
| ResultPanel | `.../components/ResultPanel.tsx` | `StickerEdgeStudio` + footer (Back, Save to book, Download PNG) |
| ImagePicker | `.../components/ImagePicker.tsx` | drop zone inside `LassoCanvas` empty state + secondary `Button`; Home drag-and-drop |
| EditorCanvas / SelectionShape | `.../components/EditorCanvas.tsx`, `SelectionShape.tsx` | `LassoCanvas` styling (ants, dim, first-point ring) |
| StickerBookPage | `src/features/stickers/library/StickerBookPage.tsx` | `StickerBookPage`: kicker + display title, 5/2 column grid of `StickerTile`, inline rename, confirm-delete `Dialog` with Undo `Toast`, empty `EmptyState`, skeleton loading |
| StickerPreviewDialog | `.../library/StickerPreviewDialog.tsx` | sticker-book detail `Dialog` (560) with Edit edge / Rename / Download PNG; zoom and pan kept (see decisions) |
| AccountPage | `src/features/account/AccountPage.tsx` | Page layout with `Paper`, `Button`, `TextField`, `Dialog` (danger confirm) |
| VerifyEmailBanner | `src/features/account/VerifyEmailBanner.tsx` | info `Toast`-style `Paper` strip |

## 2. In the app, not covered by the design system

- **Account page** (download data, delete account) and **email-verification banner**: built from the primitives (`Paper`, `Button`, `TextField`, `Dialog`, `Toast`), following the same rules.
- **Zoom/pan sticker preview** (shipped in v0.3.1 at the owner's request): kept inside the detail `Dialog`.
- **Language switch**: not specified; added as an item in the avatar menu and a quiet button when signed out.
- **Collage pages** data model: no UI yet, unchanged.

## 3. In the design system, not in the app yet

- **Sticker edge studio** (shape, width, fill) → new, maker step 2 and "Edit edge" in the book.
- **Tape studio** and "My tape roll" → new route `/tape` plus a Tape tab in the book; `TapeSpec[]` stored per user in Firestore.
- **PatternEditor** (8 kinds, 16 user colours, pixel grid, doodle pad) → new, shared by both studios.
- **Tape** presets on UI elements, `Scribble`/`Divider`, `Loader` variants, `Tooltip`, `Toast` system, `Avatar` frame.
- **Home "Recently cut"**: the book exists, so it shows real data (a mustard "Soon" tape label is not needed).
- **i18n**: the task assumes existing keys; there are none, so all copy is moved into `en`/`zh-CN` catalogues.

## 4. Implementation phases (one commit per phase or screen, on `dev`)

1. Plan (this file).
2. Foundations: Tailwind v4, `theme.css`, `tokens.css`, fonts, ground, i18n scaffold.
3. `src/paper/*` modules with tests.
4. `src/components/ui/*` on Radix, plus `/dev/design-system`.
5. Screens, one commit each: Masthead, Auth, Home, Maker, Book, Account, 404.
6. `dieCut` export, edge persistence, rules.
7. PatternEditor, StickerEdgeStudio, TapeStudio.
8. Verification (screenshots, axe, contrast, no-shadow, keyboard, reduced motion, Chinese, export parity), report, `CLAUDE.md`.

## 5. Decisions taken up front (also in `ADOPTION_REPORT.md`)

- **Branch:** the task asks for `design-system/zoofus-v2`; this repo's rule (`CLAUDE.md`) is that `dev` is the only development branch, and nothing deploys from `dev` (only tags do). Work is committed to `dev`, phase by phase.
- **Folder name:** the package was added as `zoofus-design-system/`; it is renamed to `design-system/` as its own README and the task expect.
- **Konva stays** for selection interaction because the transformer (resize/rotate) has no equivalent in the design system; only its look changes.
