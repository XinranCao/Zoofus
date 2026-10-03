import { z } from "zod";

/** Existing accounts may predate today's rules, so login only checks that something was entered. */
export const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

/** New passwords: keep in sync with the Password policy in the Firebase console (Authentication > Settings). */
export const MIN_PASSWORD_LENGTH = 8;
export const signupSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `At least ${MIN_PASSWORD_LENGTH} characters`)
    .max(128, "At most 128 characters"),
});

export type Credentials = z.infer<typeof loginSchema>;

export const profileFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(40),
});
export type ProfileForm = z.infer<typeof profileFormSchema>;

export const resetSchema = z.object({ email: z.email("Enter a valid email") });
export type ResetForm = z.infer<typeof resetSchema>;
