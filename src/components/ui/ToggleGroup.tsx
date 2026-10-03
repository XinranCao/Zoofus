import * as RToggleGroup from "@radix-ui/react-toggle-group";
import { Chip } from "./Chip";
import type { IconName } from "./Icon";

export interface ToggleOption<T extends string = string> {
  value: T;
  label: string;
  icon?: IconName;
}

/**
 * A single-select row of chips (Radix ToggleGroup): one tab stop, arrow keys move between options,
 * wraps on small screens and never scrolls sideways.
 */
export function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  seed = "",
  disabled,
}: {
  label: string;
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  seed?: string;
  disabled?: boolean;
}) {
  return (
    <RToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      className="zf-toggle-group"
      aria-label={label}
      role="radiogroup"
      disabled={disabled}
    >
      {options.map((o) => (
        <RToggleGroup.Item key={o.value} value={o.value} asChild>
          <Chip
            seed={seed + o.value}
            role="radio"
            icon={o.icon}
            selected={value === o.value}
          >
            {o.label}
          </Chip>
        </RToggleGroup.Item>
      ))}
    </RToggleGroup.Root>
  );
}
