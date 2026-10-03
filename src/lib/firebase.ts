import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
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

// Analytics is only available in supported browsers (not SSR, some privacy modes).
isSupported()
  .then((ok) => {
    if (ok) getAnalytics(app);
  })
  .catch(() => {});
