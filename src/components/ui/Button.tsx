import type { ComponentProps, CSSProperties } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { seededRot } from "@/paper/random";
import { tornVars } from "@/paper/torn";
import { useSeed } from "@/paper/useTorn";
import { Icon, type IconName } from "./Icon";
import { Typing } from "./Loader";
import { Scribble } from "./Scribble";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  loading?: boolean;
  seed?: string;
  /** Preview only: force a visual state. */
  state?: "hover" | "active" | "focus";
}

export type ButtonProps = BaseProps & Omit<ComponentProps<"button">, keyof BaseProps>;

/**
 * Flat torn paper button: primary (brick), secondary (mustard), quiet (text + hand-drawn underline
 * on hover) and danger (plum). The <button> is the torn wrapper, so Radix `asChild` triggers put
 * focus and ARIA on the element that draws the focus ring. One primary per view; labels are verbs.
 */
export function Button({
  variant = "secondary",
  size = "md",
  icon,
  loading,
  seed,
  state,
  className,
  style,
  children,
  disabled,
  onClick,
  type = "button",
  ...rest
}: ButtonProps) {
  const id = useSeed(seed);
  const off = Boolean(disabled || loading);
  const vars = tornVars(id, {
    size: size === "lg" ? "md" : "sm",
    w: size === "sm" ? 110 : 160,
    h: 44,
    edges: "trbl",
  });
  const css = {
    "--rot": variant === "quiet" || off ? "0deg" : seededRot(id, 0.8),
    ...vars,
    ...style,
  } as CSSProperties;
  return (
    <button
      type={type}
      className={cn("zf-btn zf-torn", variant, size, state && "is-" + state, className)}
      aria-disabled={off || undefined}
      aria-busy={loading || undefined}
      onClick={off ? undefined : onClick}
      style={css}
      {...rest}
    >
      <span className="zf-face">
        {loading ? (
          <Typing label={typeof children === "string" ? children : undefined} />
        ) : (
          <>
            {icon && <Icon name={icon} />}
            {children}
          </>
        )}
        {variant === "quiet" && <Scribble seed={id} />}
      </span>
    </button>
  );
}

type LinkButtonProps = BaseProps & {
  to: string;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
};

/** The same button as a router link, for navigation ("Back to the start"). */
export function ButtonLink({
  variant = "secondary",
  size = "md",
  icon,
  seed,
  state,
  className,
  to,
  children,
  onClick,
}: LinkButtonProps) {
  const id = useSeed(seed);
  const vars = tornVars(id, {
    size: size === "lg" ? "md" : "sm",
    w: size === "sm" ? 110 : 160,
    h: 44,
    edges: "trbl",
  });
  const css = {
    "--rot": variant === "quiet" ? "0deg" : seededRot(id, 0.8),
    ...vars,
  } as CSSProperties;
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn("zf-btn zf-torn", variant, size, state && "is-" + state, className)}
      style={css}
    >
      <span className="zf-face">
        {icon && <Icon name={icon} />}
        {children}
        {variant === "quiet" && <Scribble seed={id} />}
      </span>
    </Link>
  );
}
