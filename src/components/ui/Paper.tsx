import {
  useCallback,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/lib/cn";
import { seededRot } from "@/paper/random";
import type { TearSize } from "@/paper/torn";
import { useSeed, useTorn } from "@/paper/useTorn";

export interface PaperProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  ref?: Ref<HTMLElement>;
  /** A stable id so this scrap's tear never changes; never reuse one for two visible elements. */
  seed?: string;
  size?: TearSize;
  /** A colour token name: `scrap`, `scrap-warm`, `sheet-50`... */
  tone?: string;
  /** ± range of the seeded tilt in degrees; 0 for none. */
  rotate?: number;
  /** 'auto' (default): all torn, about a third keep one straight edge; or 'trbl' / any subset. */
  edges?: string;
  /** Untorn edges sit on the box (masthead). */
  flush?: boolean;
  /** false removes the pale fibre lip. */
  fiber?: boolean;
  /** Lip colour token, e.g. `cream-100` on sheet-50 faces. */
  fiberTone?: string;
  tape?: ReactNode;
  /** Observe the size (fluid widths); rebuilt only when the 64px bucket changes. */
  measure?: boolean;
  w?: number;
  h?: number;
  inline?: boolean;
  as?: ElementType;
  faceClassName?: string;
  faceStyle?: CSSProperties;
  children?: ReactNode;
}

/**
 * The base scrap: flat paper torn from a magazine. The wrapper carries rotation, the focus trace
 * and the pale fibre lip; the face carries the tone, the grain and the torn clip. No shadow.
 * The wrapper is the Radix `asChild` target, so focus and ARIA land on the element that draws the ring.
 */
export function Paper({
  ref,
  seed,
  size = "md",
  tone,
  rotate = 0,
  edges = "auto",
  flush,
  fiber = true,
  fiberTone,
  tape,
  measure,
  w,
  h,
  inline,
  as: Tag = "div",
  className,
  style,
  faceClassName,
  faceStyle,
  children,
  ...rest
}: PaperProps) {
  const id = useSeed(seed);
  const [faceRef, vars] = useTorn<HTMLDivElement>(
    id,
    { size, edges, flush, w, h, fiber: fiber ? undefined : 0 },
    measure,
  );
  const setRef = useCallback(
    (node: HTMLElement | null) => {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: HTMLElement | null }).current = node;
    },
    [ref],
  );
  const wrapperStyle = {
    "--rot": rotate === 0 ? "0deg" : seededRot(id, rotate),
    "--fiber-tone": fiberTone ? `var(--${fiberTone})` : undefined,
    ...vars,
    ...style,
  } as CSSProperties;
  return (
    <Tag
      ref={setRef}
      className={cn("zf-paper zf-torn", !inline && "is-block", className)}
      style={wrapperStyle}
      {...rest}
    >
      {tape}
      <div
        ref={faceRef}
        className={cn("zf-face", faceClassName)}
        style={
          { "--tone": tone ? `var(--${tone})` : undefined, ...faceStyle } as CSSProperties
        }
      >
        {children}
      </div>
    </Tag>
  );
}
