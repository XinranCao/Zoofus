import { Timestamp } from "firebase/firestore";
import { z } from "zod";
import { patternSpecSchema } from "@/paper/patternSchema";
import type { PatternSpec } from "@/paper/pattern";
import { TAPE_PRESETS } from "@/paper/pattern";

/** Limits shared with firestore.rules. */
export const MAX_TAPES = 50;
export const MAX_TAPE_NAME = 40;
export const TAPE_LIMITS = {
  length: { min: 40, max: 220, default: 130 },
  thickness: { min: 12, max: 36, default: 22 },
  /** Opacity as a fraction; the UI shows "see-through" as 0-50%. */
  opacity: { min: 0.5, max: 1, default: 0.82 },
  angle: { min: -90, max: 90 },
} as const;

export const TAPE_ENDS = ["torn", "cut", "pinked"] as const;
export type TapeEnds = (typeof TAPE_ENDS)[number];

/** A saved tape. Angle and length belong to each placement on a page, not to the saved tape. */
export interface TapeSpec {
  name: string;
  pattern: PatternSpec;
  thickness: number;
  opacity: number;
  ends: TapeEnds;
}

export type Tape = TapeSpec & { id: string; createdAt: Date };

export const tapeDocSchema = z.object({
  name: z.string().min(1).max(MAX_TAPE_NAME),
  pattern: patternSpecSchema,
  thickness: z.number().min(TAPE_LIMITS.thickness.min).max(TAPE_LIMITS.thickness.max),
  opacity: z.number().min(TAPE_LIMITS.opacity.min).max(TAPE_LIMITS.opacity.max),
  ends: z.enum(TAPE_ENDS),
  createdAt: z.instanceof(Timestamp).transform((t) => t.toDate()),
});

/** Starter tapes, always shown after the user's own. */
export const STARTER_TAPES: TapeSpec[] = [
  {
    name: "Pink dots",
    pattern: TAPE_PRESETS["tape-pink"]!,
    thickness: 20,
    opacity: 0.82,
    ends: "torn",
  },
  {
    name: "Lime stripe",
    pattern: TAPE_PRESETS["tape-celery"]!,
    thickness: 18,
    opacity: 0.85,
    ends: "torn",
  },
  {
    name: "Picnic",
    pattern: TAPE_PRESETS["tape-gingham"]!,
    thickness: 22,
    opacity: 0.9,
    ends: "pinked",
  },
  {
    name: "Masking",
    pattern: TAPE_PRESETS["tape-mustard"]!,
    thickness: 20,
    opacity: 0.78,
    ends: "torn",
  },
];

/** Clamp an angle to the allowed range and round to a whole degree. */
export function clampAngle(deg: number): number {
  return Math.round(
    Math.max(TAPE_LIMITS.angle.min, Math.min(TAPE_LIMITS.angle.max, deg)),
  );
}

/**
 * The tape angle for a pointer at (dx, dy) from the tape's centre. Tape has no direction, so a
 * pointer on the far side folds back into −90…90°.
 */
export function angleFromPointer(dx: number, dy: number): number {
  let d = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (d > 90) d -= 180;
  if (d < -90) d += 180;
  return clampAngle(d);
}
