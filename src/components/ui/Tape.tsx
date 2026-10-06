import { useId, useMemo, type CSSProperties } from "react";
import { rng } from "@/paper/random";
import { tapeEnds, type TapeEnds } from "@/paper/tapeShape";
import { patternMarkup, TAPE_PRESETS, type PatternSpec } from "@/paper/pattern";
import { useSeed } from "@/paper/useTorn";

export type { TapeEnds };
export type TapePreset =
  "tape-mustard" | "tape-celery" | "tape-pink" | "tape-apricot" | "tape-gingham";
const PRESET_NAMES: TapePreset[] = [
  "tape-mustard",
  "tape-celery",
  "tape-pink",
  "tape-apricot",
];

/** An inline SVG `<pattern>` fill (the same markup the canvas renderer uses). */
export function PatternFill({ spec }: { spec: PatternSpec }) {
  const base = "zp" + useId().replace(/[^a-zA-Z0-9]/g, "");
  // The id changes with the spec and the <svg> is keyed by it: some browsers keep drawing the old
  // <pattern> when its replacement has the same id, so a new size or angle would not show.
  const { id, html } = useMemo(() => {
    const json = JSON.stringify(spec);
    let h = 0;
    for (let i = 0; i < json.length; i++) h = (h * 31 + json.charCodeAt(i)) >>> 0;
    const id = base + h.toString(36);
    return { id, html: patternMarkup(spec, 1, id) };
  }, [spec, base]);
  return (
    <svg
      key={id}
      className="zf-pattern"
      width="100%"
      height="100%"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export interface TapeProps {
  seed?: string;
  pattern?: PatternSpec;
  color?: TapePreset;
  /** −90…90°, any value. Seeded ±8° when omitted. */
  angle?: number;
  /** 40-220px. */
  length?: number;
  /** 12-36px. */
  thickness?: number;
  /** 0.5-1. */
  opacity?: number;
  ends?: TapeEnds;
  x?: string;
  y?: string;
}

/**
 * A strip of washi or masking tape the user can turn, size, print and finish. Decorative
 * (aria-hidden) and flat. UI rules: at most two per element and about six per viewport, never on
 * buttons, chips, inputs or menus; user pages have no limit.
 */
export function Tape({
  seed,
  pattern,
  color,
  angle,
  length = 72,
  thickness = 20,
  opacity = 0.82,
  ends = "torn",
  x = "50%",
  y = "0",
}: TapeProps) {
  const id = useSeed(seed);
  const R = rng("tape" + id);
  const spec =
    pattern ??
    (color ? TAPE_PRESETS[color] : undefined) ??
    TAPE_PRESETS[PRESET_NAMES[Math.floor(R() * 4)]!]!;
  const ang = angle ?? Number(((R() * 2 - 1) * 8).toFixed(1));
  const style: CSSProperties = {
    left: x,
    top: y,
    width: length,
    height: thickness,
    opacity,
    transform: `translate(-50%,-50%) rotate(${ang}deg)`,
    clipPath: tapeEnds(id, ends, length, thickness),
  };
  return (
    <span className="zf-tape" aria-hidden="true" style={style}>
      <PatternFill spec={spec} />
    </span>
  );
}
