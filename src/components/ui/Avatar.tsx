import type { ComponentProps, CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { seededRot } from "@/paper/random";
import { tornVars } from "@/paper/torn";
import { useSeed } from "@/paper/useTorn";
import { Icon } from "./Icon";

interface BaseProps {
  name?: string;
  src?: string | null;
  /** 34 (menu), 40 (masthead) or 72 (sign-up). */
  size?: number;
  seed?: string;
  /** Preview only. */
  state?: "focus";
  /** A non-interactive avatar renders a span. */
  asStatic?: boolean;
}

export type AvatarProps = BaseProps &
  Omit<ComponentProps<"button">, keyof BaseProps | "children">;

/**
 * The user's photo (or initial) on a round image inside a small torn sheet-white frame. As a
 * button it is the account-menu trigger; the frame takes the traced focus ring.
 */
export function Avatar({
  name,
  src,
  size = 40,
  seed,
  state,
  asStatic,
  className,
  style,
  ...rest
}: AvatarProps) {
  const id = useSeed(seed ?? name);
  const css = {
    "--rot": seededRot(id, 3),
    "--fiber-tone": "var(--cream-100)",
    ...tornVars("av" + id, { size: "xs", w: size, h: size, amp: 1.6, res: 2 }),
    ...style,
  } as CSSProperties;
  const inner = (
    <span
      className="zf-face"
      style={{ "--tone": "var(--sheet-50)", padding: 3 } as CSSProperties}
    >
      <span
        className="zf-avatar__img"
        style={{ width: size - 6, height: size - 6, fontSize: size * 0.42 }}
      >
        {src ? (
          <img
            src={src}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : name?.trim() ? (
          name.trim()[0]!.toUpperCase()
        ) : (
          <Icon name="user" />
        )}
      </span>
    </span>
  );
  if (asStatic) {
    return (
      <span
        className={cn("zf-avatar zf-torn is-static", state && "is-" + state, className)}
        style={css}
      >
        {inner}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={cn("zf-avatar zf-torn", state && "is-" + state, className)}
      style={css}
      {...rest}
    >
      {inner}
    </button>
  );
}
