import * as RLabel from "@radix-ui/react-label";
import { useId, type ComponentProps, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { seededRot } from "@/paper/random";
import { tornVars } from "@/paper/torn";
import { useSeed } from "@/paper/useTorn";
import { Icon } from "./Icon";
import { Scribble } from "./Scribble";

interface BaseProps {
  label: string;
  hint?: string;
  /** Error message; shows the blush face, raspberry wave and a plum message. */
  error?: string | null;
  seed?: string;
  /** Preview only. */
  state?: "focus";
}

export type TextFieldProps = BaseProps & Omit<ComponentProps<"input">, keyof BaseProps>;

/**
 * A labelled input on a torn sheet-white field with a hand-drawn underline. Spreads native input
 * props, so it works with react-hook-form's `register`. 16px text stops iOS zooming; the
 * placeholder is never the label.
 */
export function TextField({
  label,
  hint,
  error,
  seed,
  state,
  id: idProp,
  className,
  disabled,
  ref,
  ...input
}: TextFieldProps) {
  const auto = useId();
  const id = idProp ?? auto;
  const s = useSeed(seed);
  const describedBy = hint || error ? id + "-help" : undefined;
  const boxStyle = {
    transform: `rotate(${seededRot(s, 0.4)})`,
    "--fiber-tone": "var(--cream-100)",
    ...tornVars(s, { size: "sm", w: 320 }),
  } as CSSProperties;
  return (
    <div
      className={cn(
        "zf-field",
        error && "is-error",
        disabled && "is-disabled",
        state && "is-" + state,
        className,
      )}
    >
      <RLabel.Root className="zf-field__label" htmlFor={id}>
        {label}
      </RLabel.Root>
      <div className="zf-field__box zf-torn" style={boxStyle}>
        <div className="zf-face">
          <input
            id={id}
            ref={ref}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            {...input}
          />
          <Scribble seed={s} variant={error ? "wave" : "line"} />
        </div>
      </div>
      {(error || hint) && (
        <div
          id={id + "-help"}
          className="zf-field__hint"
          role={error ? "alert" : undefined}
        >
          {error && (
            <Icon
              name="alert"
              style={{ width: 16, height: 16, color: "var(--danger-mark)", marginTop: 2 }}
            />
          )}
          {error || hint}
        </div>
      )}
    </div>
  );
}
