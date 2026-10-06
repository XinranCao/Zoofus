import { Timestamp } from "firebase/firestore";
import { z } from "zod";

export const MAX_COLLECTIONS = 100;
export const MAX_COLLECTION_ITEMS = 500;
export const MAX_COLLECTION_NAME = 60;

/** What can live in a collection: a pointer to one of your own things. */
export const ITEM_KINDS = ["sticker", "tape", "journal"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const collectionItemSchema = z.object({
  k: z.enum(ITEM_KINDS),
  id: z.string().min(1).max(64),
});
export type CollectionItem = z.infer<typeof collectionItemSchema>;

export const collectionDocSchema = z.object({
  name: z.string().min(1).max(MAX_COLLECTION_NAME),
  /** Unreadable pointers are dropped, so one bad entry never hides the collection. */
  items: z.array(z.unknown()).transform((list) =>
    list.flatMap((i) => {
      const r = collectionItemSchema.safeParse(i);
      return r.success ? [r.data] : [];
    }),
  ),
  createdAt: z
    .instanceof(Timestamp)
    .nullable()
    .transform((t) => (t ? t.toDate() : new Date())),
  updatedAt: z
    .instanceof(Timestamp)
    .nullable()
    .transform((t) => (t ? t.toDate() : new Date())),
});

export type Collection = z.output<typeof collectionDocSchema> & { id: string };

export const itemKey = (i: CollectionItem) => `${i.k}:${i.id}`;
export const sameItem = (a: CollectionItem, b: CollectionItem) =>
  a.k === b.k && a.id === b.id;
