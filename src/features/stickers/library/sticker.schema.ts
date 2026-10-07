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
  /**
   * A small WebP of the sticker (320 px, at most 20 kB) for tiles, pickers and collections, next to
   * the full file. Stickers saved before v1.8.0 get one the first time they are on screen.
   */
  thumbUrl: z.string().optional().catch(undefined),
  thumbPath: z.string().optional().catch(undefined),
  /** The edge-less cut-out, kept so "Edit edge" can redo the edge. Older stickers don't have one. */
  sourcePath: z.string().optional(),
  sourceUrl: z.string().optional(),
  /**
   * The lasso outline as text, and where the cut-out sits in the stored picture. Together they
   * replace the second (edge-less) picture: the cut-out is rebuilt from the sticker itself.
   */
  outline: z.string().optional().catch(undefined),
  cut: z
    .object({
      x: z.number().int(),
      y: z.number().int(),
      w: z.number().int().positive(),
      h: z.number().int().positive(),
    })
    .optional()
    .catch(undefined),
  edge: edgeSpecSchema.optional(),
  seed: z.string().optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  createdAt: z
    .instanceof(Timestamp)
    .nullable()
    .transform((t) => (t ? t.toDate() : new Date())),
});

/**
 * `editable` stickers keep their edge-less cut-out (a second picture, in older ones) or its outline (newer ones), so the edge can be redone. `legacy` stickers
 * (saved before the edge editor) have the border baked into one image and nothing else: they
 * display, download and rename like any other, but cannot change their edge.
 */
export type StickerKind = "editable" | "legacy";

export type Sticker = Omit<z.output<typeof stickerDocSchema>, "edge"> & {
  id: string;
  edge?: EdgeSpec;
  kind: StickerKind;
};

export const stickerKind = (doc: {
  sourceUrl?: string;
  sourcePath?: string;
  outline?: string;
  cut?: unknown;
}): StickerKind =>
  (doc.sourceUrl && doc.sourcePath) || (doc.outline && doc.cut) ? "editable" : "legacy";

export const MAX_STICKER_NAME = 60;

/**
 * The picture for a small place (a tile, a picker, a folder, a face): the small one when the sticker
 * has it, else the full file. The open view and the journal page always use `imageUrl`.
 */
export const smallPicture = (s: Pick<Sticker, "imageUrl" | "thumbUrl">): string =>
  s.thumbUrl || s.imageUrl;

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
