import { z } from "zod";
import {
  MAX_DOODLE_STROKES,
  MAX_STROKE_LENGTH,
  PATTERN_KINDS,
  STROKE_PATTERN,
  USER_COLORS,
} from "./pattern";
import type { EdgeSpec } from "./renderSticker";

/** Users print with the 16 palette colours only. */
const userColour = z.enum(USER_COLORS);

export const patternSpecSchema = z.object({
  kind: z.enum(PATTERN_KINDS as [string, ...string[]]),
  bg: userColour,
  ink: userColour.optional(),
  scale: z.number().min(6).max(28).optional(),
  angle: z.number().min(0).max(180).optional(),
  weight: z.number().min(0.1).max(0.9).optional(),
  /** exactly 8 rows of 8 cells, each 0 or 1 */
  pixels: z
    .array(z.string().regex(/^[01]{8}$/))
    .length(8)
    .optional(),
  /** ≤ 60 paths of ≤ 2,000 characters, path data only (no markup) */
  strokes: z
    .array(z.string().max(MAX_STROKE_LENGTH).regex(STROKE_PATTERN))
    .max(MAX_DOODLE_STROKES)
    .optional(),
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
