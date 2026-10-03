import { useId, useMemo, type CSSProperties } from "react";
import { f1, rng } from "@/paper/random";
import { patternMarkup, TAPE_PRESETS, type PatternSpec } from "@/paper/pattern";
import { tornClip } from "@/paper/torn";
import { useSeed } from "@/paper/useTorn";

export type TapeEnds = "torn" | "cut" | "pinked";
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
  const id = "zp" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const html = useMemo(() => patternMarkup(spec, 1, id), [spec, id]);
  return (
    <svg
      className="zf-pattern"
      width="100%"
      height="100%"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** Pinking-shear ends are a user choice only, never UI chrome. */
function tapeEnds(seed: string, ends: TapeEnds, len: number, th: number): string {
  if (ends === "cut") return "none";
  if (ends === "pinked") {
    const n = Math.max(3, Math.round(th / 5));
    const P = ["4px 0", "calc(100% - 4px) 0"];
    let i: number;
    for (i = 1; i <= n; i++)
      P.push(
        (i % 2 ? "calc(100% - 0px) " : "calc(100% - 4px) ") + f1((i / n) * 100) + "%",
      );
    P.push("4px 100%");
    for (i = n - 1; i >= 1; i--)
      P.push((i % 2 ? "0 " : "4px ") + f1((i / n) * 100) + "%");
    return "polygon(" + P.join(",") + ")";
  }
  // torn short ends, long edges straight like real tape
  return tornClip("tp" + seed, {
    size: "xs",
    edges: "lr",
    amp: 2.6,
    res: 1.4,
    nick: 0,
    fiber: 0,
    w: len,
    h: th,
  });
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
