import type { ComponentProps, CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { seededRot } from "@/paper/random";
import { tornVars } from "@/paper/torn";
import { useSeed } from "@/paper/useTorn";
import { Icon, type IconName } from "./Icon";

interface BaseProps {
  selected?: boolean;
  icon?: IconName;
  seed?: string;
  state?: "focus";
}

export type ChipProps = BaseProps & Omit<ComponentProps<"button">, keyof BaseProps>;

/**
 * A small torn toggle for tools, shapes, pattern kinds, tape direction and ends. The selected
 * state is lime with an icon or check, never colour alone. Used standalone (aria-pressed) or as a
 * Radix ToggleGroup item (which supplies role and aria-checked).
 */
export function Chip({
  selected,
  icon,
  seed,
  state,
  className,
  style,
  children,
  disabled,
  onClick,
  ...rest
}: ChipProps) {
  const id = useSeed(seed);
  const css = {
    "--rot": disabled ? "0deg" : seededRot(id, 0.8),
    ...tornVars(id, { size: "xs", w: 90, h: 34 }),
    ...style,
  } as CSSProperties;
  const grouped = rest.role === "radio";
  return (
    <button
      type="button"
      className={cn("zf-chip zf-torn", state && "is-" + state, className)}
      aria-pressed={grouped ? undefined : Boolean(selected)}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
      style={css}
      {...rest}
    >
      <span className="zf-face">
        {icon && <Icon name={icon} />}
        {children}
        {selected && !icon && <Icon name="check" style={{ width: 14, height: 14 }} />}
      </span>
    </button>
  );
}
