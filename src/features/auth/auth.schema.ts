import { z } from "zod";

// Error messages are i18n keys; components translate them with t(message).

/** Existing accounts may predate today's rules, so login only checks that something was entered. */
export const loginSchema = z.object({
  email: z.email("auth.errors.email"),
  password: z.string().min(1, "auth.errors.passwordRequired"),
});

/** New passwords: keep in sync with the Password policy in the Firebase console (Authentication > Settings). */
export const MIN_PASSWORD_LENGTH = 8;
export const signupSchema = z.object({
  email: z.email("auth.errors.email"),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, "auth.errors.passwordShort")
    .max(128, "auth.errors.passwordShort"),
});

export type Credentials = z.infer<typeof loginSchema>;

export const profileFormSchema = z.object({
  name: z.string().trim().min(1, "auth.errors.name").max(40, "auth.errors.name"),
});
export type ProfileForm = z.infer<typeof profileFormSchema>;

export const resetSchema = z.object({ email: z.email("auth.errors.email") });
export type ResetForm = z.infer<typeof resetSchema>;
