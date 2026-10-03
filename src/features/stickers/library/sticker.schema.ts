import { Timestamp } from "firebase/firestore";
import { z } from "zod";
import { edgeSpecSchema } from "@/paper/patternSchema";
import type { EdgeSpec } from "@/paper/renderSticker";

/** A saved sticker as stored in `users/{uid}/stickers/{id}` (the id is the document id). */
export const stickerDocSchema = z.object({
  name: z.string(),
  storagePath: z.string(),
  imageUrl: z.string(),
  /** Legacy: stickers saved before v0.3.1 have a small thumbnail. It is no longer created or shown, only deleted with the sticker. */
  thumbnailUrl: z.string().optional(),
  thumbnailPath: z.string().optional(),
  /** The edge-less cut-out, kept so "Edit edge" can redo the edge. Older stickers don't have one. */
  sourcePath: z.string().optional(),
  sourceUrl: z.string().optional(),
  edge: edgeSpecSchema.optional(),
  seed: z.string().optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  createdAt: z.instanceof(Timestamp).transform((t) => t.toDate()),
});

export type Sticker = Omit<z.output<typeof stickerDocSchema>, "edge"> & {
  id: string;
  edge?: EdgeSpec;
};

export const MAX_STICKER_NAME = 60;

/** Per-account limits. The size limit sits just under storage.rules (2 MB); the count is enforced by the client. */
export const MAX_STICKERS = 200;
export const MAX_STICKER_BYTES = 1.9 * 1024 * 1024;

/** A save was refused for a known reason; `code` lets the UI show a translated message. */
export class StickerLimitError extends Error {
  code: "count" | "size";
  constructor(message: string, code: "count" | "size") {
    super(message);
    this.code = code;
  }
}
