import { z } from "zod";

const schema = z.object({
  VITE_APP_API_KEY: z.string().min(1),
  VITE_APP_AUTH_DOMAIN: z.string().min(1),
  VITE_APP_PROJECT_ID: z.string().min(1),
  VITE_APP_STORAGE_BUCKET: z.string().min(1),
  VITE_APP_MESSAGING_SENDER_ID: z.string().min(1),
  VITE_APP_APP_ID: z.string().min(1),
  VITE_APP_MEASUREMENT_ID: z.string().optional(),
  /** reCAPTCHA Enterprise site key for Firebase App Check; App Check is off when unset. */
  VITE_APP_RECAPTCHA_SITE_KEY: z.preprocess(
    // A missing GitHub secret arrives as an empty string.
    (v) => (v === "" ? undefined : v),
    z.string().optional(),
  ),
  /** Fixed App Check debug token for local `npm run dev` (from .env.development.local). */
  VITE_APPCHECK_DEBUG_TOKEN: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().optional(),
  ),
  /** "true" connects the app to the local Firebase emulators (see `npm run dev:emulated`). */
  VITE_USE_EMULATORS: z.enum(["true", "false"]).optional(),
});

const parsed = schema.safeParse(import.meta.env);
if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
  throw new Error(
    `Missing or invalid environment variables: ${missing}. See README (Setup).`,
  );
}

export const env = parsed.data;
