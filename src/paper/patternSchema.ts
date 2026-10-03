import { z } from "zod";
import { MAX_DOODLE_STROKES, PATTERN_KINDS, USER_COLORS, isSafeStroke } from "./pattern";
import type { EdgeSpec } from "./renderSticker";

/** Users print with the 16 palette colours only. */
const userColour = z.enum(USER_COLORS);

/**
 * Saved prints are read leniently. Documents written by older versions can carry values the
 * current limits refuse (a doodle stroke with an arc command, a colour outside the 16): rather
 * than failing the whole list, a bad stroke is dropped and a bad colour or number falls back to
 * its default. Writing is held to the limits by the editors, the rules and `cleanForFirestore`.
 */
const strokes = z
  .array(z.unknown())
  .transform((list) => list.filter(isSafeStroke).slice(0, MAX_DOODLE_STROKES));

export const patternSpecSchema = z.object({
  kind: z.enum(PATTERN_KINDS as [string, ...string[]]),
  bg: userColour.catch("sheet-50"),
  ink: userColour.optional().catch(undefined),
  scale: z.number().min(6).max(28).optional().catch(undefined),
  angle: z.number().min(0).max(180).optional().catch(undefined),
  weight: z.number().min(0.1).max(0.9).optional().catch(undefined),
  /** exactly 8 rows of 8 cells, each 0 or 1 */
  pixels: z
    .array(z.string().regex(/^[01]{8}$/))
    .length(8)
    .optional()
    .catch(undefined),
  /** at most 60 paths of at most 2,000 characters, path data only (no markup) */
  strokes: strokes.optional().catch(undefined),
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
