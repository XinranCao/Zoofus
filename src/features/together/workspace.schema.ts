import { Timestamp } from "firebase/firestore";
import { z } from "zod";
import { patternSpecSchema } from "@/paper/patternSchema";
import { itemSchema, pageSpecSchema, type Item } from "@/features/journal/journal.schema";

export const MAX_MEMBERS = 8;
export const MAX_INVITED = 12;

const date = z.instanceof(Timestamp).transform((t) => t.toDate());

export const workspaceDocSchema = z.object({
  title: z.string().min(1).max(80),
  ownerUid: z.string(),
  members: z.array(z.string()).min(1),
  invited: z.array(z.string()).catch([]),
  page: pageSpecSchema,
  createdAt: date,
  updatedAt: date,
});
export type Workspace = z.output<typeof workspaceDocSchema> & { id: string };

/** An object on a shared page is a journal item plus who last touched it. */
export const itemDocSchema = z.intersection(
  itemSchema,
  z.object({ by: z.string().optional(), upd: z.unknown().optional() }),
);

export function itemFromDoc(data: unknown): Item | null {
  const r = itemDocSchema.safeParse(data);
  if (!r.success) return null;
  const { by: _by, upd: _upd, ...item } = r.data as Item & { by?: string; upd?: unknown };
  return item as Item;
}

const stickerAsset = z.object({
  kind: z.literal("sticker"),
  owner: z.string(),
  /** The picture itself (a `data:` URL), or a link for older entries. */
  url: z.string(),
  path: z.string().optional(),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
  name: z.string().max(80),
});
const tapeAsset = z.object({
  kind: z.literal("tape"),
  owner: z.string(),
  name: z.string().max(80),
  tape: z.object({
    pattern: patternSpecSchema,
    thickness: z.number(),
    opacity: z.number(),
    ends: z.enum(["torn", "cut", "pinked"]),
  }),
});
export const shelfDocSchema = z.discriminatedUnion("kind", [stickerAsset, tapeAsset]);
export type ShelfEntry = (z.infer<typeof stickerAsset> | z.infer<typeof tapeAsset>) & {
  id: string;
};

export const presenceSchema = z.object({ name: z.string(), color: z.string(), ts: date });
export interface Presence {
  uid: string;
  name: string;
  color: string;
  ts: Date;
}
