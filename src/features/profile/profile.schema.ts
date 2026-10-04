import { z } from "zod";

export const MAX_NICKNAME = 40;

export const profileSchema = z.object({
  uid: z.string(),
  nickname: z.string(),
  profilePictureUrl: z.string(),
  email: z.string(),
  /** `sticker`: made in the sticker maker (transparent, with its own shape); `photo`: an uploaded photo. */
  avatarKind: z.enum(["sticker", "photo"]).optional().catch(undefined),
  /** Storage path of the picture, so the old file can be removed when it changes. */
  avatarPath: z.string().optional().catch(undefined),
});

export type Profile = z.infer<typeof profileSchema>;

export const nicknameSchema = z.string().trim().min(1).max(MAX_NICKNAME);
