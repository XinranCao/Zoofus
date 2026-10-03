import { z } from "zod";

const schema = z.object({
  VITE_APP_API_KEY: z.string().min(1),
  VITE_APP_AUTH_DOMAIN: z.string().min(1),
  VITE_APP_PROJECT_ID: z.string().min(1),
  VITE_APP_STORAGE_BUCKET: z.string().min(1),
  VITE_APP_MESSAGING_SENDER_ID: z.string().min(1),
  VITE_APP_APP_ID: z.string().min(1),
  VITE_APP_MEASUREMENT_ID: z.string().optional(),
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
