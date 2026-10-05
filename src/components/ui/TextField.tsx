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
  /** A box for several lines of text. */
  multiline?: boolean;
  /** Keep the label for screen readers but do not show it (the surroundings say what the field is). */
  hideLabel?: boolean;
  /** Marks the field as needed: a star after the label (hidden from screen readers) and `aria-required`. */
  required?: boolean;
  rows?: number;
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
  multiline,
  hideLabel,
  required,
  rows = 4,
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
      <RLabel.Root className={cn("zf-field__label", hideLabel && "sr-only")} htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden="true" className="zf-field__req">
            {" "}
            *
          </span>
        )}
      </RLabel.Root>
      {/* a tap anywhere on the scrap, torn margin included, focuses the field */}
      <div
        className="zf-field__box zf-torn"
        style={boxStyle}
        onPointerDown={(e) => {
          const el = e.currentTarget.querySelector<HTMLElement>("input, textarea");
          if (el && e.target !== el && !disabled) {
            e.preventDefault();
            el.focus();
          }
        }}
      >
        <div className="zf-face">
          {multiline ? (
            <textarea
              id={id}
              rows={rows}
              disabled={disabled}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              aria-required={required || undefined}
              {...(input as unknown as ComponentProps<"textarea">)}
            />
          ) : (
            <input
              id={id}
              ref={ref}
              disabled={disabled}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              aria-required={required || undefined}
              {...input}
            />
          )}
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
