import { z } from "zod";
import { PALETTE, PATTERN_KINDS, type PaletteName } from "./pattern";
import type { EdgeSpec } from "./renderSticker";

const names = Object.keys(PALETTE) as [PaletteName, ...PaletteName[]];
const paletteName = z.enum(names);

/** Limits shared with firestore.rules (pixels 8 rows, strokes ≤ 40). */
export const MAX_DOODLE_STROKES = 40;
export const MAX_STROKE_LENGTH = 4000;

export const patternSpecSchema = z.object({
  kind: z.enum(PATTERN_KINDS as [string, ...string[]]),
  bg: paletteName,
  ink: paletteName.optional(),
  scale: z.number().min(6).max(28).optional(),
  angle: z.number().min(0).max(180).optional(),
  weight: z.number().min(0.1).max(0.9).optional(),
  pixels: z
    .array(z.string().regex(/^[01]{8}$/))
    .length(8)
    .optional(),
  strokes: z.array(z.string().max(MAX_STROKE_LENGTH)).max(MAX_DOODLE_STROKES).optional(),
});

export const edgeSpecSchema = z.object({
  shape: z.enum(["smooth", "wobbly", "torn"]),
  scale: z.number().min(0).max(1.6),
  fill: patternSpecSchema,
});

/** Firestore rejects `undefined`; this strips optional fields that were never set. */
export function cleanForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function parseEdge(value: unknown): EdgeSpec | null {
  const r = edgeSpecSchema.safeParse(value);
  return r.success ? (r.data as EdgeSpec) : null;
}
