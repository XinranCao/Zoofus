import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { env } from "./env";

const app = initializeApp({
  apiKey: env.VITE_APP_API_KEY,
  authDomain: env.VITE_APP_AUTH_DOMAIN,
  projectId: env.VITE_APP_PROJECT_ID,
  storageBucket: env.VITE_APP_STORAGE_BUCKET,
  messagingSenderId: env.VITE_APP_MESSAGING_SENDER_ID,
  appId: env.VITE_APP_APP_ID,
  measurementId: env.VITE_APP_MEASUREMENT_ID,
});

const useEmulators = env.VITE_USE_EMULATORS === "true";

// App Check must be initialised before any other service is used, so it goes first.
// It proves requests come from this app, not a script using the public API key.
// Enabled when a site key is configured. See docs/app-check.md for the console setup.
if (!useEmulators && env.VITE_APP_RECAPTCHA_SITE_KEY) {
  if (import.meta.env.DEV) {
    // Local dev against the real backend: use the registered debug token, or print a new one.
    (
      self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: string | boolean }
    ).FIREBASE_APPCHECK_DEBUG_TOKEN = env.VITE_APPCHECK_DEBUG_TOKEN ?? true;
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(env.VITE_APP_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

if (useEmulators) {
  // The emulators run on the machine serving the page, so another device on the same network
  // (opening http://<this-machine's-ip>:5173) reaches them through the host it loaded from.
  const host = window.location.hostname || "127.0.0.1";
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
  connectStorageEmulator(storage, host, 9199);
}

// Analytics is only available in supported browsers, and is skipped against the emulators.
// It is also loaded after the page is up (its own chunk), so it never delays the first paint.
if (!useEmulators) {
  const start = () =>
    import("firebase/analytics")
      .then(async ({ getAnalytics, isSupported }) => {
        if (await isSupported()) getAnalytics(app);
      })
      .catch(() => {});
  if (typeof window !== "undefined") {
    if (document.readyState === "complete") setTimeout(start, 1000);
    else window.addEventListener("load", () => setTimeout(start, 1000), { once: true });
  }
}
