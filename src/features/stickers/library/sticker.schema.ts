import { Timestamp } from "firebase/firestore";
import { z } from "zod";

/** A saved sticker as stored in `users/{uid}/stickers/{id}` (the id is the document id). */
export const stickerDocSchema = z.object({
  name: z.string(),
  storagePath: z.string(),
  imageUrl: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  createdAt: z.instanceof(Timestamp).transform((t) => t.toDate()),
});

export type Sticker = z.output<typeof stickerDocSchema> & { id: string };

export const MAX_STICKER_NAME = 60;
