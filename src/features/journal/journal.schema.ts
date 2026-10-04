import { Timestamp } from "firebase/firestore";
import { z } from "zod";
import { USER_COLORS, PALETTE, type PaletteName } from "@/paper/pattern";
import { patternSpecSchema } from "@/paper/patternSchema";

/**
 * A journal (手账) is one page: its paper, and a list of small objects on it. Stickers are
 * pointers (an id, never the picture), tapes are their print, text is a string and a pen stroke is
 * a short encoded path. Nothing heavy is stored, so a page is a few kilobytes.
 * Keep the limits in step with `firestore.rules`.
 */
export const MAX_JOURNAL_ITEMS = 400;
export const MAX_JOURNAL_TITLE = 80;
export const MAX_TEXT = 500;
export const MAX_STROKE_CHARS = 8000;

export const PAPERS = ["notebook", "newspaper", "magazine"] as const;
export type Paper = (typeof PAPERS)[number];

/** What is printed on the paper: ruling for a notebook, columns for newsprint, a finish for a magazine. */
export const PATTERNS_BY_PAPER: Record<Paper, readonly string[]> = {
  notebook: ["ruled", "grid", "dots", "cross", "blank"],
  newspaper: ["columns", "plain"],
  magazine: ["gloss", "matte"],
};
export const ALL_PATTERNS = [
  "ruled",
  "grid",
  "dots",
  "cross",
  "blank",
  "columns",
  "plain",
  "gloss",
  "matte",
] as const;
export type Pattern = (typeof ALL_PATTERNS)[number];

export const PAGE_SIZES = [
  { key: "a6", width: 600, height: 848 },
  { key: "a5", width: 840, height: 1188 },
  { key: "square", width: 900, height: 900 },
  { key: "wide", width: 1188, height: 840 },
  { key: "tall", width: 720, height: 1440 },
] as const;
export const PAGE_LIMITS = { min: 300, max: 3000 } as const;

const colour = z.enum(USER_COLORS);

export const pageSpecSchema = z.object({
  width: z.number().int().min(PAGE_LIMITS.min).max(PAGE_LIMITS.max),
  height: z.number().int().min(PAGE_LIMITS.min).max(PAGE_LIMITS.max),
  paper: z.enum(PAPERS),
  pattern: z.enum(ALL_PATTERNS),
  color: colour,
});
export type PageSpec = z.infer<typeof pageSpecSchema>;

export const DEFAULT_PAGE: PageSpec = {
  width: 840,
  height: 1188,
  paper: "notebook",
  pattern: "ruled",
  color: "cream-100",
};

/** A pattern that makes sense for the paper (switching paper resets an impossible one). */
export const patternFor = (paper: Paper, pattern: string): Pattern =>
  (PATTERNS_BY_PAPER[paper].includes(pattern)
    ? pattern
    : PATTERNS_BY_PAPER[paper][0]) as Pattern;

// ---------------------------------------------------------------- items

export const STROKE_TOOLS = ["pen", "pencil", "marker", "crayon"] as const;
export type StrokeTool = (typeof STROKE_TOOLS)[number];

const id = z.string().min(1).max(24);
const n = (min: number, max: number) => z.number().finite().min(min).max(max);
const base = {
  id,
  x: n(-20000, 20000),
  y: n(-20000, 20000),
  r: n(-720, 720),
  z: z.number().int(),
};

/** Ink colours for text and pens: the user palette plus the dark inks. */
export const INK_COLORS = [...USER_COLORS, "loden-900"] as const;
export const inkName = z
  .string()
  .max(32)
  .refine((c) => c in PALETTE);

export const stickerItemSchema = z.object({
  ...base,
  t: z.literal("s"),
  /** A sticker's id, or `a:<id>` for a picture kept inside the journal (`assets`). */
  ref: z.string().min(1).max(70),
  sc: n(0.02, 40),
});
export const tapeItemSchema = z.object({
  ...base,
  t: z.literal("t"),
  tape: z.object({
    pattern: patternSpecSchema,
    thickness: n(12, 36),
    opacity: n(0.5, 1),
    ends: z.enum(["torn", "cut", "pinked"]),
  }),
  len: n(10, 3000),
});
export const textItemSchema = z.object({
  ...base,
  t: z.literal("x"),
  text: z.string().max(MAX_TEXT),
  font: z.string().max(32),
  size: n(4, 600),
  color: inkName,
  bold: z.boolean().optional(),
  w: n(1, 4000).optional(),
});
export const strokeItemSchema = z.object({
  ...base,
  t: z.literal("p"),
  tool: z.enum(STROKE_TOOLS),
  color: inkName,
  size: n(1, 80),
  pts: z.string().max(MAX_STROKE_CHARS),
});

export const itemSchema = z.discriminatedUnion("t", [
  stickerItemSchema,
  tapeItemSchema,
  textItemSchema,
  strokeItemSchema,
]);
export type Item = z.infer<typeof itemSchema>;
export type StickerItem = z.infer<typeof stickerItemSchema>;
export type TapeItem = z.infer<typeof tapeItemSchema>;
export type TextItem = z.infer<typeof textItemSchema>;
export type StrokeItem = z.infer<typeof strokeItemSchema>;
export type InkName = PaletteName;

/** Items read from storage: unreadable ones are dropped rather than failing the journal. */
export const itemsSchema = z.array(z.unknown()).transform((list) =>
  list.flatMap((i) => {
    const r = itemSchema.safeParse(i);
    return r.success ? [r.data] : [];
  }),
);

/** A picture kept inside a journal (a sticker that came from someone else). It is a file in the journal's owner's folder. */
export const assetSchema = z.object({
  url: z.string().max(2048),
  path: z.string().max(512),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
  name: z.string().max(80),
});
export type Asset = z.infer<typeof assetSchema>;
export const assetsSchema = z.record(z.string(), z.unknown()).transform((rec) => {
  const out: Record<string, Asset> = {};
  for (const [k, v] of Object.entries(rec)) {
    const r = assetSchema.safeParse(v);
    if (r.success) out[k] = r.data;
  }
  return out;
});

export const journalDocSchema = z.object({
  title: z.string().min(1).max(MAX_JOURNAL_TITLE),
  page: pageSpecSchema,
  items: itemsSchema,
  assets: assetsSchema.optional().catch(undefined),
  thumbUrl: z.string().optional().catch(undefined),
  thumbPath: z.string().optional().catch(undefined),
  origin: z
    .object({ from: z.string().optional(), workspace: z.string().optional() })
    .optional()
    .catch(undefined),
  createdAt: z.instanceof(Timestamp).transform((t) => t.toDate()),
  updatedAt: z.instanceof(Timestamp).transform((t) => t.toDate()),
});
export type Journal = z.output<typeof journalDocSchema> & { id: string };

export const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);

/** The base size of a sticker on a page: its longer side at scale 1, in page units. */
export const STICKER_BASE = 240;
