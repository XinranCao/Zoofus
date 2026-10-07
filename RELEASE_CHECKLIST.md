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

What changed since the last deploy (the state at tag `v1.7.6`: `git diff v1.7.6 -- firestore.rules storage.rules`), all for v1.8.0:

- `firestore.rules`, journals: `items` is optional and `itemCount` (0 to 400) is allowed; a journal's items live in `journals/{id}/body/items` (owner only, only that document name, at most 400 items, `updatedAt` must be the server time); a journal may also be updated by `slimOnly()` (its items move out, nothing else changes, so its updated time stays).
- `firestore.rules`, inbox: `inbox/{sid}/body/items` (a friend can create it only in the same batch as a share they send, at most 400 items; the owner reads and deletes it; the sender can delete it to take a share back).
- `firestore.rules`, stickers: `thumbUrl` and `thumbPath` (own folder) on create, and on update so an older sticker can be given one.
- `storage.rules`: a file ending `_t.webp` under `{uid}/stickers/` must be WebP and at most 100 kB (the small picture of a sticker).
- Effect on existing data: nothing is rewritten by the deploy. Older journals keep their inline `items` and are moved to `body/items` by the app, a few at a time, as people use it (or at their next save). Older stickers get a small picture the first time they are on screen. Older shares keep their items in the payload and are read as before.

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

`firebase.json` sends the security headers on every page, an **enforcing** Content-Security-Policy and a year-long cache on `/assets/**`. `e2e/csp.spec.ts` proves, on a production build, that the main flows raise no violation (the share, Together and Google sign-in specs `friends`, `together` and `google-signin` run there too, and fail on any violation, through `e2e/support/csp-guard.ts`) and that an inline script, an unlisted frame, an outside image and an outside request are all caught.

After the deploy, check the real headers and the console:

```bash
curl -sI https://zoofus-48264.web.app | grep -iE "content-security-policy|x-content-type-options|x-frame-options|referrer-policy|permissions-policy"
curl -sI "https://zoofus-48264.web.app/assets/$(curl -s https://zoofus-48264.web.app | grep -o 'index-[^"]*\.js' | head -1)" | grep -i cache-control
```

Then open the live site and watch the browser console on sign in (**including Google sign-in with the real Google popup**; the e2e run only has the Auth Emulator's), Together "Save a copy", a sticker, a tape, a journal, Friends and Together: a `Refused to ...` message means the policy blocked something the app needs. zod's `eval` probe is expected (it falls back). To fix one, add the origin to the matching directive in `firebase.json` and release again. To switch the policy off in an emergency, change the key `Content-Security-Policy` to `Content-Security-Policy-Report-Only` and redeploy hosting.

## 4. Rollback

- **App**: Firebase console → Hosting → Release history → roll back to the previous release (or `git revert` on `main`, tag a patch, and let the workflow redeploy). **From v1.8.0 a rollback below v1.8 is not harmless:** a journal whose items have moved to `body/items` has no `items` in its own document, and v1.7.x skips a journal like that (it reads as missing in the list) until v1.8 is back; shares sent from v2 show no page to a v1.7.x receiver. Nothing is lost (the data is all there). Prefer fixing forward with a patch; if you must roll back, roll forward again as soon as the cause is fixed.
- **Rules**: redeploy the previous rules from git, for example

  ```bash
  git show ds-v2-round1:firestore.rules > /tmp/firestore.rules
  git show ds-v2-round1:storage.rules > /tmp/storage.rules
  ```

  copy them over `firestore.rules` and `storage.rules` in a throwaway checkout, and run the deploy command in step 1 there. Rolling the rules back does not delete any data.

- **Data**: v1.8.0 moves data, one journal at a time, in the user's own browser (`useSlimming`: `items` into `body/items`, same content, `updatedAt` kept). It never deletes anything that is not also written elsewhere first (one batch). There is no switch to move it back; copying `body/items` into `items` on a journal restores the older shape by hand.
