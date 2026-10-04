import * as RMenu from "@radix-ui/react-dropdown-menu";
import { useId, type CSSProperties } from "react";
import { tornClip } from "@/paper/torn";
import { Chip } from "./Chip";
import { Icon } from "./Icon";
import { Paper } from "./Paper";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  /** Shown in this style (a font option is set in its own font). */
  style?: CSSProperties;
  /** Options with the same group are listed together under its heading. */
  group?: string;
}

/**
 * A drop-down for a choice with many options: a torn button that shows the current one, and a
 * scrap-paper list (Radix DropdownMenu: arrow keys, typeahead, Esc) with the current option checked.
 */
export function Select<T extends string>({
  label,
  options,
  value,
  onChange,
  seed = "",
  disabled,
  groupLabels,
}: {
  label: string;
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  seed?: string;
  disabled?: boolean;
  groupLabels?: Record<string, string>;
}) {
  const id = useId();
  const current = options.find((o) => o.value === value);
  const clip = {
    "--clip-item": tornClip(seed + "si", { size: "xs", w: 220, h: 36 }),
  } as CSSProperties;
  const groups: { name: string | undefined; items: SelectOption<T>[] }[] = [];
  for (const o of options) {
    const last = groups[groups.length - 1];
    if (last && last.name === o.group) last.items.push(o);
    else groups.push({ name: o.group, items: [o] });
  }
  return (
    <RMenu.Root modal={false}>
      <RMenu.Trigger asChild disabled={disabled}>
        <Chip
          seed={seed + "sel"}
          className="zf-select"
          aria-label={`${label}: ${current?.label ?? ""}`}
          aria-describedby={id}
          disabled={disabled}
        >
          <span className="zf-select__value" style={current?.style}>
            {current?.label ?? label}
          </span>
          <Icon name="chevron" style={{ width: 16, height: 16 }} />
        </Chip>
      </RMenu.Trigger>
      <RMenu.Portal>
        <RMenu.Content asChild align="start" sideOffset={8} collisionPadding={12}>
          <Paper
            seed={seed + "sc"}
            size="md"
            tone="scrap"
            rotate={0}
            className="zf-menu zf-select__menu z-50"
            style={{ minWidth: 220, ...clip }}
          >
            <span id={id} hidden>
              {label}
            </span>
            <RMenu.RadioGroup
              value={value}
              onValueChange={(v) => onChange(v as T)}
              aria-label={label}
              className="zf-select__list"
            >
              {groups.map((g, i) => (
                <div key={g.name ?? i}>
                  {g.name && groupLabels?.[g.name] && (
                    <RMenu.Label className="zf-select__group">
                      {groupLabels[g.name]}
                    </RMenu.Label>
                  )}
                  {g.items.map((o) => (
                    <RMenu.RadioItem
                      key={o.value}
                      value={o.value}
                      className="zf-menu__item"
                      style={o.style}
                    >
                      <span style={{ flex: 1 }}>{o.label}</span>
                      <RMenu.ItemIndicator>
                        <Icon name="check" style={{ width: 16, height: 16 }} />
                      </RMenu.ItemIndicator>
                    </RMenu.RadioItem>
                  ))}
                </div>
              ))}
            </RMenu.RadioGroup>
          </Paper>
        </RMenu.Content>
      </RMenu.Portal>
    </RMenu.Root>
  );
}
