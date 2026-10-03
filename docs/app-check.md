# Firebase App Check setup (one-time, in the consoles)

> **Status:** done. App Check is registered and enforced for Firestore, Storage and Authentication (owner, October 2026). The steps below stay as the record and for setting it up again.

**Cost:** App Check is free. On the web it uses reCAPTCHA Enterprise, free for the first 10,000 assessments per month (one per app token). Without a billing account you stay on the free Essentials tier; above 10,000 a month, Standard is $8/month and needs billing. Set the token lifetime to 1 day or more (step 2) to keep usage low. If the free quota ran out while enforcement is on, token requests would fail, so keep an eye on the reCAPTCHA usage page.

App Check makes Firestore, Storage and Auth reject requests that do not come from the real app. The code is already wired: it activates when `VITE_APP_RECAPTCHA_SITE_KEY` is set.

1. Google Cloud console, project `zoofus-48264`: enable **reCAPTCHA Enterprise**, create a **website key** for `zoofus-48264.web.app`, `zoofus-48264.firebaseapp.com` and `localhost`.
2. Firebase console, App Check: register the web app with **reCAPTCHA Enterprise** and that site key, and set the **token time-to-live to 1 day**.
3. Add the key as the GitHub Actions secret `VITE_APP_RECAPTCHA_SITE_KEY` (and to your local `.env`), (the workflows already pass it to the build).
4. Local dev against the real backend: `npm run dev` uses a fixed debug token from `.env.development.local` (git-ignored, not read by `vite build`). To set it up on another machine, create one with `npx firebase-tools@latest appcheck:debugtokens:create <new-uuid> --app <web app id> --project zoofus-48264`, put it in `.env.development.local` as `VITE_APPCHECK_DEBUG_TOKEN=<new-uuid>`, and delete tokens you no longer use in the console (App Check > Apps > Manage debug tokens). Treat the token as a secret.
5. Watch the App Check metrics for a few days (unenforced), confirm verified requests, then **Enforce** for Firestore, Storage and Authentication.

The local emulators ignore App Check.

## Also worth setting

- A **budget alert** in Google Cloud Billing, so abuse shows up as an email.
- Auth: restrict sign-up to the providers you use (Email/Password, Google).
