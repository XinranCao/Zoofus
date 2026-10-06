import { Timestamp } from "firebase/firestore";
import { z } from "zod";
import { pictureUrlSchema } from "@/lib/trustedUrl";
import { edgeSpecSchema } from "@/paper/patternSchema";
import { patternSpecSchema } from "@/paper/patternSchema";
import { ITEM_KINDS } from "@/features/collections/collection.schema";
import {
  assetsSchema,
  itemsSchema,
  pageSpecSchema,
} from "@/features/journal/journal.schema";

const date = z
  .instanceof(Timestamp)
  .nullable()
  .transform((t) => (t ? t.toDate() : new Date()));

export const MAX_NOTE = 200;
export const MAX_FRIEND_NAME = 40;

export const publicProfileSchema = z.object({
  nickname: z.string(),
  avatarUrl: pictureUrlSchema.catch(""),
  avatarKind: z.enum(["sticker", "photo"]).optional().catch(undefined),
  avatarKey: z.string().optional().catch(undefined),
  friendCode: z.string(),
});
export type PublicProfile = z.infer<typeof publicProfileSchema>;

export const friendDocSchema = z.object({
  since: date,
  nickname: z.string().max(MAX_FRIEND_NAME).optional().catch(undefined),
});

export interface Friend {
  uid: string;
  /** My name for them. */
  alias?: string;
  since: Date;
  profile: PublicProfile | null;
}

/** The name to show for a friend: mine for them if I gave one, else theirs. */
export const friendName = (f: Pick<Friend, "alias" | "profile">, fallback = "") =>
  f.alias?.trim() || f.profile?.nickname || fallback;

export const requestDocSchema = z.object({ from: z.string(), createdAt: date });
export const sentDocSchema = z.object({ to: z.string(), createdAt: date });

export interface FriendRequest {
  from: string;
  createdAt: Date;
  profile: PublicProfile | null;
}

// ----------------------------------------------------------------- what a share carries

export const stickerPayloadSchema = z.object({
  name: z.string().max(60),
  imageUrl: pictureUrlSchema,
  sourceUrl: pictureUrlSchema.optional().catch(undefined),
  outline: z.string().max(30000).optional().catch(undefined),
  cut: z
    .object({
      x: z.number().int(),
      y: z.number().int(),
      w: z.number().int().positive(),
      h: z.number().int().positive(),
    })
    .optional()
    .catch(undefined),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  edge: edgeSpecSchema.optional().catch(undefined),
  seed: z.string().optional().catch(undefined),
});
export const tapePayloadSchema = z.object({
  name: z.string().max(40),
  pattern: patternSpecSchema,
  thickness: z.number(),
  opacity: z.number(),
  ends: z.enum(["torn", "cut", "pinked"]),
});
export const journalPayloadSchema = z.object({
  title: z.string().max(80),
  page: pageSpecSchema,
  items: itemsSchema,
  assets: assetsSchema.optional().catch(undefined),
  /** A picture of the page, so the inbox can show it. */
  thumbUrl: pictureUrlSchema.optional().catch(undefined),
});

export type StickerPayload = z.infer<typeof stickerPayloadSchema>;
export type TapePayload = z.infer<typeof tapePayloadSchema>;
export type JournalPayload = z.infer<typeof journalPayloadSchema>;

export const shareDocSchema = z.object({
  from: z.string(),
  kind: z.enum(ITEM_KINDS),
  name: z.string(),
  note: z.string().optional().catch(undefined),
  payload: z.unknown(),
  files: z.array(z.string()).catch([]),
  seen: z.boolean().catch(false),
  /** I have kept it as my own: it can only be kept once. */
  saved: z.boolean().catch(false),
  createdAt: date,
});

export type Share = z.output<typeof shareDocSchema> & { id: string };
