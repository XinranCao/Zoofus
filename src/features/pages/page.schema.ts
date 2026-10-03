import { Timestamp } from "firebase/firestore";
import { z } from "zod";

/** Limits shared by the client and the Firestore rules (keep `firestore.rules` in sync). */
export const MAX_PAGE_ITEMS = 200;
export const MAX_PAGE_TITLE = 80;
export const DEFAULT_PAGE_SIZE = { width: 1080, height: 1440 } as const;

/** One sticker placed on a page. Positions are in page units, measured from the page's top-left. */
export const pageItemSchema = z.object({
  id: z.string().min(1),
  stickerId: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  scale: z.number().finite().positive(),
  rotation: z.number().finite(),
  /** Stacking order; higher is drawn on top. */
  z: z.number().int(),
});
export type PageItem = z.infer<typeof pageItemSchema>;

/** A collage / journal page as stored in `users/{uid}/pages/{id}` (the id is the document id). */
export const pageDocSchema = z.object({
  title: z.string().max(MAX_PAGE_TITLE),
  width: z.number().int().min(100).max(4000),
  height: z.number().int().min(100).max(4000),
  background: z.string().max(32),
  items: z.array(pageItemSchema).max(MAX_PAGE_ITEMS),
  createdAt: z.instanceof(Timestamp).transform((t) => t.toDate()),
  updatedAt: z.instanceof(Timestamp).transform((t) => t.toDate()),
});

export type Page = z.output<typeof pageDocSchema> & { id: string };
