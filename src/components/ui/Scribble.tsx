import type { CSSProperties } from "react";
import { scribblePath } from "@/paper/scribble";
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

/** An irregular dashed divider (never 4 4). */
export function Divider({ seed }: { seed?: string }) {
  return (
    <div className="zf-divider" role="separator">
      <Scribble seed={seed} variant="dashed" />
    </div>
  );
}
