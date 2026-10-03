import { Timestamp } from "firebase/firestore";
import { z } from "zod";

/** A saved sticker as stored in `users/{uid}/stickers/{id}` (the id is the document id). */
export const stickerDocSchema = z.object({
  name: z.string(),
  storagePath: z.string(),
  imageUrl: z.string(),
  /** Small preview for grids; older stickers don't have one. */
  thumbnailUrl: z.string().optional(),
  thumbnailPath: z.string().optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  createdAt: z.instanceof(Timestamp).transform((t) => t.toDate()),
});

export type Sticker = z.output<typeof stickerDocSchema> & { id: string };

export const MAX_STICKER_NAME = 60;

/** Per-account limits. The size limit sits just under storage.rules (2 MB); the count is enforced by the client. */
export const MAX_STICKERS = 200;
export const MAX_STICKER_BYTES = 1.9 * 1024 * 1024;

export class StickerLimitError extends Error {}
