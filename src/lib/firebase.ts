import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
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

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

const useEmulators = env.VITE_USE_EMULATORS === "true";

// App Check proves requests come from this app, not a script using the public API key.
// Enabled when a site key is configured. See docs/app-check.md for the console setup.
if (!useEmulators && env.VITE_APP_RECAPTCHA_SITE_KEY) {
  if (import.meta.env.DEV) {
    // Local dev against the real backend: log a debug token to register in the console.
    (
      self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: boolean }
    ).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(env.VITE_APP_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}
if (useEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
}

// Analytics is only available in supported browsers, and is skipped against the emulators.
if (!useEmulators) {
  isSupported()
    .then((ok) => {
      if (ok) getAnalytics(app);
    })
    .catch(() => {});
}
