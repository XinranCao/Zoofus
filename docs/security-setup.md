# Security setup checklist (one-time, in the consoles)

> **Status:** done. The Blaze plan, the budget alert, the Auth restrictions, the API key restriction and App Check enforcement are all in place (owner, October 2026). The steps below stay as the record.

Done in code: owner-only Firestore/Storage rules, App Check wiring, per-account sticker limits.
These items live in the consoles and need an owner account.

## 0. Billing plan (required for uploads)

Cloud Storage for Firebase no longer works on the free Spark plan (uploads fail with HTTP 402). Upgrade `zoofus-48264` to the **Blaze** (pay-as-you-go) plan: Firebase console > Usage and billing > Modify plan, then link a billing account. Small usage stays inside the free quota: new `*.firebasestorage.app` buckets follow the Cloud Storage Always Free tier in `US-CENTRAL1`, `US-EAST1` and `US-WEST1` (5 GB stored); check the bucket location under Storage > Files. Do step 1 right after upgrading.

## 1. Budget alert (Google Cloud Billing)

1. https://console.cloud.google.com/billing and pick the billing account linked to `zoofus-48264`.
   If no billing account is listed, the project is still on the Spark plan: do step 0 first.
2. Budgets & alerts > **Create budget**. Name: `Zoofus monthly`.
3. Scope: **Projects** > `zoofus-48264`, all services.
4. Amount: specified amount, for example **$5** per month.
5. Alert thresholds: 50%, 90% and 100% of actual spend, plus 100% forecasted.
6. Notifications: keep email alerts to billing admins on, and confirm your email is a billing admin.
   Alerts do not stop spending; they warn you early.

## 2. Authentication restrictions (Firebase console > Authentication)

1. **Sign-in method**: only Email/Password and Google enabled. Turn off Anonymous or anything else. Keep "Email link (passwordless)" off.
2. **Settings > Authorized domains**: keep `zoofus-48264.web.app`, `zoofus-48264.firebaseapp.com` and `localhost`; delete the rest.
3. **Settings > User actions**: keep sign-up and account deletion enabled (the app needs both).
4. **Settings > Password policy**: minimum length 8 (the app enforces 8 on sign-up). Optionally require upper and lower case and a number, but then the sign-up form must say so.
5. **Settings > Email enumeration protection**: enable.

## 3. Restrict the browser API key (Google Cloud console)

1. https://console.cloud.google.com/apis/credentials?project=zoofus-48264 > open **Browser key (auto created by Firebase)**.
2. Application restrictions: **Websites**; add `https://zoofus-48264.web.app/*`, `https://zoofus-48264.firebaseapp.com/*`, `http://localhost:*/*`.
3. Leave API restrictions as they are (restricting them can break Firebase features).
4. After saving, wait a few minutes and test sign-in on the live site.

## 4. App Check enforcement (after the v0.3.0 release is deployed)

See `docs/app-check.md`: deploy the release first, use the live site, check the App Check metrics show verified requests, then enforce Firestore, Storage and Authentication one at a time.
