import type { ComponentProps, CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { safeDisplayUrl } from "@/lib/trustedUrl";
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
  /**
   * `sticker`: the picture is a die-cut sticker (transparent, with its own edge) and is shown
   * with its own shape, not in a round frame.
   */
  kind?: "sticker" | "photo";
}

export type AvatarProps = BaseProps &
  Omit<ComponentProps<"button">, keyof BaseProps | "children">;

/**
 * The user's photo (or initial) on a round image inside a small torn sheet-white frame. As a
 * button it is the account-menu trigger; the frame takes the traced focus ring.
 */
export function Avatar({
  name,
  src: srcProp,
  size = 40,
  seed,
  state,
  asStatic,
  kind,
  className,
  style,
  ...rest
}: AvatarProps) {
  const id = useSeed(seed ?? name);
  // a picture from anywhere but this app's own storage is never requested: the initial shows instead
  const src = safeDisplayUrl(srcProp);
  if (kind === "sticker" && src) {
    const stickerCss = {
      width: size,
      height: size,
      "--rot": seededRot(id, 3),
      ...style,
    } as CSSProperties;
    const img = <img src={src} alt="" className="zf-avatar__sticker" />;
    return asStatic ? (
      <span
        className={cn("zf-avatar is-sticker is-static", className)}
        style={stickerCss}
      >
        {img}
      </span>
    ) : (
      <button
        type="button"
        className={cn("zf-avatar is-sticker", className)}
        style={stickerCss}
        {...rest}
      >
        {img}
      </button>
    );
  }
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
