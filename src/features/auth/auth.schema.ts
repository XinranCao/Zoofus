import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});
export type Credentials = z.infer<typeof credentialsSchema>;

export const profileFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(40),
});
export type ProfileForm = z.infer<typeof profileFormSchema>;

export const resetSchema = z.object({ email: z.email("Enter a valid email") });
export type ResetForm = z.infer<typeof resetSchema>;
