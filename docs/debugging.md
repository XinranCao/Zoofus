# Debugging Zoofus

Start here when something fails. Work from the symptom to the tool, in this order: **the page → the browser → the console of Firebase**.

## 1. The `/diagnostics` page (works in production and in the emulators)

Open `/diagnostics` while signed in, press **Run checks**, then **Copy report** and paste it into the bug report. It shows:

| Check                 | Tells you                                                                         |
| --------------------- | --------------------------------------------------------------------------------- |
| Where this is running | version, production or emulators, the address, who is signed in                   |
| App Check token       | whether the browser gets a token, which app it is for, and when it ends           |
| Firestore read        | Auth + App Check + rules for reading your profile                                 |
| Storage write / read  | uploading and reading back a 1-pixel picture by link and by SDK, then deleting it |
| Recent errors         | the last 80 errors the app saw, each with its error code                          |

Reading the result:

- **Everything ✓** → the plumbing works; the problem is in one feature. Reproduce it, then reopen the page and read _Recent errors_.
- **App Check token ✗** → see section 4. Nothing else can work while App Check is enforced.
- **Firestore ✗ but App Check ✓** → rules, sign-in, or network. `permission-denied` = rules; `unavailable` = network/blocked.
- **Storage write ✗** → `storage/unauthorized` = rules or App Check; `storage/retry-limit-exceeded` or `timeout` = connection (the app gives up after 30 s instead of spinning).
- **Storage read ✗ "by link" but ✓ "by SDK"** (or the reverse) → a cache/CORS issue in one of the two read paths; `readPicture` falls back from one to the other.

Add `?debug=1` to any address (or use the button on the page) to turn on Firestore's own verbose log in the browser console; `?debug=0` turns it off.

## 2. The browser

- **Console**: errors are also kept on `/diagnostics`. Every failure the app shows carries a code in brackets, for example `(timeout/upload)`. The code is the first thing to look up.
- **Network** (tick _Preserve log_, then repeat the action). Filter by `firestore`, `firebasestorage` and `appcheck`. Look for the red row: status **401/403** = rules or App Check, **400** = bad request (check the response body), **0/cancelled** = blocked (ad blocker, offline, CORS).
- A 400 on `google.com/recaptcha/enterprise/clr` alone is reCAPTCHA's own housekeeping and is harmless. What matters is the `exchangeRecaptchaEnterpriseToken` request on `firebaseappcheck.googleapis.com`.

## 3. Error codes that the app produces

| Code                                                             | Meaning                                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `permission-denied`, `storage/unauthorized`                      | Rules (or App Check) refused it. Check the rules and the signed-in user. |
| `unauthenticated`                                                | Signed out, or the sign-in expired.                                      |
| `unavailable`, `deadline-exceeded`                               | Network or Firestore not reachable.                                      |
| `resource-exhausted`, HTTP 402                                   | Quota or plan (Storage needs the Blaze plan).                            |
| `storage/retry-limit-exceeded`                                   | The upload/download kept failing for 30 s.                               |
| `timeout/read`, `timeout/upload`, `timeout/link`, `timeout/send` | A share step got no answer in time. `send` may still arrive later.       |
| `appCheck/*`                                                     | App Check could not get a token (section 4).                             |

Errors are also counted in **Google Analytics** as the event `app_error` (parameters `code` and `where`), at most one per code per session, only in production. Firebase console → Analytics → Events → `app_error` shows how many people hit a problem; add `code` as a custom dimension to break it down.

## 4. App Check (the usual cause when "everything is slow or fails in production only")

App Check is **enforced** for Firestore, Storage and Auth, so a request without a valid token is refused. In Firebase console → App Check → APIs, the metrics are:

- _Verified_ – a valid token. This should be nearly 100 %.
- _Unverified: unknown origin_ – no token at all (plain `<img>` loads, scripts, curl).
- _Unverified: invalid_ – a token was sent but is not valid.

If _invalid_ is high on Firestore or Storage, real users are being refused. In the meantime consider switching that API to **Unenforced** (console → App Check → APIs → the API → Unenforce) so people are not blocked while you fix it; switch it back when _Verified_ is above ~95 %.

Find the cause with `/diagnostics` → _App Check token_:

| What it says                                                          | Fix                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✓ and "matches this build's app id"                                   | Tokens are fine. Invalid requests come from elsewhere: old open tabs or cached app versions, preview-channel URLs (`…--pr-…web.app`) that are not in the reCAPTCHA key's domain list, unregistered debug tokens, browsers/extensions that block reCAPTCHA. Wait a day and re-read the metrics. |
| ✓ but "DIFFERS from this build's app id"                              | The build's `VITE_APP_APP_ID` is not the web app registered in App Check. Fix the GitHub secret or register that app.                                                                                                                                                                          |
| ✗ `appCheck/recaptcha-error`, `appCheck/fetch-status-error` (403/400) | In Google Cloud → reCAPTCHA Enterprise: the key must list the exact origin (`zoofus-48264.web.app`, `zoofus-48264.firebaseapp.com`, `localhost`); the API must be enabled; check the monthly assessment quota. In Firebase → App Check → Apps: the web app must use that same key.             |
| ✗ `appCheck/throttled`                                                | Too many failed attempts; fix the cause above, then wait a few minutes.                                                                                                                                                                                                                        |
| "off (no site key in this build)" in production                       | `VITE_APP_RECAPTCHA_SITE_KEY` was empty at build time (missing GitHub secret).                                                                                                                                                                                                                 |

Setup steps and local debug tokens are in `docs/app-check.md`.

## 5. Firebase console and Google Cloud (production)

- **Firestore → Rules → Monitoring** (and the same in Storage): evaluations allowed/denied over time. A spike of denials when users fail = a rules problem.
- **Firestore / Storage → Usage**: requests and errors per day.
- **Google Cloud → Logging → Logs Explorer**: server-side logs. Data-access audit logs for Firestore and Storage are off by default; turn them on (IAM & Admin → Audit logs) only while debugging, they cost money.
- **Rules Playground** (Firestore → Rules): try a read or write as a given user against the deployed rules.
- **Production from your own machine**: `npm run dev` against the real backend uses the debug token in `.env.development.local` (see `docs/app-check.md`). Do not test destructive flows there.

## 6. The emulators

Start: `npm run emulators` and `npm run dev:emulated` (or the preview servers `firebase-emulators` and `zoofus-emulated`).

| What                                                                          | Where                                                                                                                                    |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| The app                                                                       | `http://localhost:5173`                                                                                                                  |
| Emulator UI (data, files, users, **Requests** tab with every rule evaluation) | `http://localhost:4000`                                                                                                                  |
| Auth / Firestore / Storage                                                    | ports 9099 / 8080 / 9199                                                                                                                 |
| Logs                                                                          | `firebase-debug.log`, `firestore-debug.log` in the project folder (git-ignored); rule errors also appear in the Emulator UI Requests tab |

- The emulators forget everything when they stop. App Check is off in them.
- **Another device on the network**: open `http://<this-machine's-ip>:5173`. The app talks to the emulators on that same address, and links to pictures stored through `localhost` are pointed at it automatically (`src/lib/emulatorUrl.ts`). Check the address with `ipconfig getifaddr en0`.
- **A rules test fails**: `npm run test:rules`; the message names the rejected path. Reproduce it in the Emulator UI Requests tab.
- **An e2e test fails**: traces are kept for failed runs: `npx playwright show-trace test-results/<test-folder>/trace.zip`. Run one test with `npx firebase-tools@14 emulators:exec --only auth,firestore,storage --project demo-zoofus "playwright test e2e/<file>.spec.ts"`.
- Try `/diagnostics` in the emulators too: it should be all ✓ except _App Check_ (skipped).

## 7. What to include in a bug report

The copied `/diagnostics` report, the exact steps, the time, and the code shown in the error message. With those, most problems can be placed in one of the sections above in a minute.
