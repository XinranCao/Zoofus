# Release checklist

For the next release from `dev` (journals, collections, friends, together). Nothing here has been run.

> **New rules must be deployed first.** The app now uses `journals`, `collections`, `friends`, `requests`, `inbox`, `sent`, `publicProfiles`, `friendCodes` and `workspaces` (with `items`, `assets`, `presence`) in Firestore, and `{uid}/journals`, `{uid}/shares`, `{uid}/collab` in Storage. Until `firestore.rules` and `storage.rules` are deployed, `npm run dev` against production fails on those features. Use the emulators meanwhile. Steps that change production are marked **PRODUCTION**.

## 0. Before anything

```bash
git switch dev && git pull --ff-only
npm ci
npm run check            # typecheck, lint, unit tests, build
npm run test:rules       # needs Java 17+, and the Firebase emulators not already running
npm run test:e2e         # emulator e2e, design-system checks (English, Chinese, reduced motion)
```

Everything must pass. The e2e suite also leaves screenshots in `design-system/verification/` (not committed).

## 1. Rules and storage (**PRODUCTION**, do this before the app)

> **Done for v0.4.0:** the rules in this repository were deployed on 2026-10-03 (`firestore:rules` and `storage`), before the release. Repeat this step only when `firestore.rules` or `storage.rules` change again.

The new app writes things the live rules do not allow (or, for the older fields, the rules deployed after round 1 allow but do not bound). Deploy the rules first so a new client never meets old rules:

```bash
npx firebase-tools@14 deploy --only firestore:rules,storage --project zoofus-48264
```

What changed since the last deploy (the state at tag `ds-v2-round1`, which is what was deployed after round 1: `git diff ds-v2-round1 -- firestore.rules storage.rules`):

- `firestore.rules`: `validPattern` now allows only the known keys; `bg` and `ink` must be one of the 16 user colours; `scale` 6–28, `angle` 0–180, `weight` 0.1–0.9; `pixels` must be 8 rows of `^[01]{8}$`; `strokes` is a list of at most 60 whose first entry must be path data (`^[MLQCSTZmlqcstz0-9 .,-]+$`, at most 2,000 characters). Applies to tapes and to a sticker's `edge.fill`.
- `storage.rules`: under `{uid}/stickers/`, `image/png` up to 10 MB or `image/webp` under 2 MB (it was `image/(webp|png)` under 2 MB).
- Effect on existing data: nothing is rewritten. A document that already breaks a new limit (a print whose colour is outside the 16, or a doodle stroke with an arc command) is still readable but will be refused if that document is updated (for example, renaming that tape). New tapes and edges written by this version are inside the limits.

To dry-run the rules against the emulators only, `npm run test:rules` does that without touching production.

## 2. App (**PRODUCTION**)

Normal release (see `CLAUDE.md`, "Release process"): CHANGELOG entry, version bump, merge `dev` to `main`, annotated tag `vX.Y.Z`, push `main` and the tag. The tag triggers `release.yml`, which tests, builds and deploys to Firebase Hosting and creates the GitHub Release.

Manual deploy of hosting only, as a last resort (needs the local `.env`):

```bash
npm run build
npx firebase-tools@14 deploy --only hosting --project zoofus-48264
```

The build has about 650 files in `dist/assets` (the Chinese font slices); that is expected.

## 3. Smoke test on https://zoofus-48264.web.app

Use a throwaway account and a photo with a clear subject.

1. **Sign up** with email and a password of 8+ characters; add a nickname. You land on Home. Switch the language to 中文 and back (account menu → Language; the bar has the switch only before you sign in).
2. **Cut**: Upload a photo. Choose a shape and drag on the photo to draw it (there is no Add shape button), or draw a freehand loop (try leaving the photo's edge and coming back: the corner in between is included). Cut it out.
3. **Edit the edge**: try Smooth, Wobbly and Torn; pick a stripes print and a pixel print (paint by dragging). Save to book.
4. **Download** the PNG from the book (open the sticker, Download PNG). Open the file next to the on-screen sticker: **the edge width and the print should look the same**, only sharper.
5. Open the book, **Edit edge** on the sticker, change the shape, save. The tile updates.
6. **Make a tape** at `/tape`: turn it, change the print, add it to the roll. The four starter tapes are still on the roll.
7. **Delete the sticker** (and use Undo once). Delete it again and wait about 6 seconds. In the Firebase console (Storage) both `{uid}/stickers/…` files for it are gone.
8. **Delete the account** from Account (type DELETE and the password). Check that the user's Auth record, Firestore documents and Storage files are gone.

Also open the book on an account that already had stickers from the earlier version: it must load (older documents are read leniently), and resize the window to about 400 px high to check that a dialog's title and buttons stay in view while its middle scrolls.

Also look at one older sticker saved before the redesign, if the account has any: it shows, downloads and renames, and says it cannot change its edge.

### Security headers and the CSP

`firebase.json` sends the security headers on every page and a year-long cache on `/assets/**`. The Content-Security-Policy is **report-only** for now: the browser logs violations in its console and blocks nothing. After each release, open the live site and watch the console on sign in, a sticker, a tape, a journal, Friends and Together for `Content-Security-Policy-Report-Only` messages (`e2e/csp.spec.ts` does the same against the emulators; zod's `eval` probe is expected and falls back).

To **promote** it to enforcing: when a release has shown no violations, change the header key in `firebase.json` from `Content-Security-Policy-Report-Only` to `Content-Security-Policy` (and the key `vite.config.ts` and `e2e/csp.spec.ts` look for), deploy, and repeat the smoke test above, including Google sign in. If something breaks, change the key back and redeploy; a missing origin goes into the matching directive.

## 4. Rollback

- **App**: Firebase console → Hosting → Release history → roll back to the previous release (or `git revert` on `main`, tag a patch, and let the workflow redeploy). The sticker documents the new version writes (`edge`, `seed`, `sourcePath`) are ignored by the old version, which is why the rollback is safe; the old version shows the baked image.
- **Rules**: redeploy the previous rules from git, for example

  ```bash
  git show ds-v2-round1:firestore.rules > /tmp/firestore.rules
  git show ds-v2-round1:storage.rules > /tmp/storage.rules
  ```

  copy them over `firestore.rules` and `storage.rules` in a throwaway checkout, and run the deploy command in step 1 there. Rolling the rules back does not delete any data.

- **Data**: this release performs no migration, so there is nothing to undo in Firestore or Storage.
