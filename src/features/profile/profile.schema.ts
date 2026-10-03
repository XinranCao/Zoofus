import { z } from "zod";

export const profileSchema = z.object({
  uid: z.string(),
  nickname: z.string(),
  profilePictureUrl: z.string(),
  email: z.string(),
});

export type Profile = z.infer<typeof profileSchema>;
