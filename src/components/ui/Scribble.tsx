import type { CSSProperties } from "react";
import { circlePath, scribblePath } from "@/paper/scribble";
import { useSeed } from "@/paper/useTorn";

/** A seeded hand-drawn line: input underline, current-page underline, quiet-button hover. */
export function Scribble({
  seed,
  variant = "line",
  weight = 1.6,
  className = "",
  style,
}: {
  seed?: string;
  variant?: "line" | "wave" | "dashed";
  weight?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const s = useSeed(seed);
  return (
    <svg
      className={("zf-scribble " + className).trim()}
      viewBox="0 0 200 8"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={style}
    >
      <path
        d={scribblePath(s, { wave: variant === "wave" })}
        fill="none"
        stroke="currentColor"
        strokeWidth={weight}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        strokeDasharray={variant === "dashed" ? "7 5 3 6 9 5" : undefined}
      />
    </svg>
  );
}

/** A seeded hand-drawn loop round its parent, to mark the chosen one (e.g. the language). */
export function Circled({ seed, weight = 1.8 }: { seed?: string; weight?: number }) {
  const s = useSeed(seed);
  return (
    <svg
      className="zf-circled"
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={circlePath(s)}
        fill="none"
        stroke="currentColor"
        strokeWidth={weight}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** An irregular dashed divider (never 4 4). */
export function Divider({ seed }: { seed?: string }) {
  return (
    <div className="zf-divider" role="separator">
      <Scribble seed={seed} variant="dashed" />
    </div>
  );
}
