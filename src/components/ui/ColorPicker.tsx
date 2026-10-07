import * as RPopover from "@radix-ui/react-popover";
import * as RRadio from "@radix-ui/react-radio-group";
import { useTranslation } from "react-i18next";
import { useId, useState, type ComponentProps, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { hex, USER_COLORS } from "@/paper/pattern";
import { seededRot } from "@/paper/random";
import { tornVars } from "@/paper/torn";
import { Chip } from "./Chip";
import { Icon } from "./Icon";
import { Paper } from "./Paper";

/** Border presets for the sticker edge. */
export const BORDER_COLORS: [string, string][] = [
  ["sheet-50", "Paper white"],
  ["cream-100", "Cream"],
  ["blush-100", "Blush"],
  ["celery-200", "Celery"],
  ["mustard-300", "Mustard"],
  ["kraft-100", "Kraft"],
];

export const COLOR_NAMES: Record<string, string> = {
  "sheet-50": "Paper white",
  "cream-100": "Cream",
  "peach-100": "Peach",
  "blush-100": "Blush",
  "pink-200": "Pink",
  "celery-200": "Celery",
  "lime-300": "Lime",
  "mustard-300": "Mustard",
  "apricot-300": "Apricot",
  "rose-400": "Rose",
  "olive-500": "Olive",
  "tangerine-400": "Tangerine",
  "brick-600": "Brick",
  "plum-900": "Plum",
  "moss-700": "Moss",
  "cocoa-800": "Cocoa",
  "kraft-100": "Kraft",
};

export type SwatchProps = { token: string; label: string; selected?: boolean } & Omit<
  ComponentProps<"button">,
  "children"
>;

/** One torn colour chip. The selected one is set straight, gets the traced ring and a check. */
export function Swatch({
  token,
  label,
  selected,
  style,
  className,
  ...rest
}: SwatchProps) {
  // the same colour appears in more than one picker at once: each swatch tears differently
  const uid = useId();
  const css = {
    "--rot": seededRot(token, 3),
    ...tornVars("sw" + token + uid, { size: "xs", w: 32, h: 32, res: 2 }),
    ...style,
  } as CSSProperties;
  return (
    <button
      type="button"
      className={cn("zf-swatch zf-torn", className)}
      aria-label={label}
      title={label}

      style={css}
      {...rest}
    >
      <span className="zf-face" style={{ "--tone": hex(token) } as CSSProperties} />
      {selected && <Icon name="check" className="zf-swatch__check" />}
    </button>
  );
}

/** A radiogroup of torn swatches (Radix RadioGroup). */
export function ColorPicker({
  value,
  onChange,
  colors = BORDER_COLORS,
  columns,
  label = "Colour",
}: {
  value: string;
  onChange: (token: string) => void;
  colors?: readonly (string | [string, string])[];
  columns?: number;
  label?: string;
}) {
  const { t } = useTranslation();
  const list = colors.map((c): [string, string] =>
    typeof c === "string"
      ? [c, t(`colours.${c}`, { defaultValue: COLOR_NAMES[c] ?? c })]
      : c,
  );
  return (
    <RRadio.Root
      value={value}
      onValueChange={onChange}
      aria-label={label}
      className={cn("zf-swatches", columns ? "compact" : false)}
      style={
        columns ? { gridTemplateColumns: `repeat(${columns}, 28px)`, gap: 8 } : undefined
      }
    >
      {list.map(([token, name]) => (
        <RRadio.Item key={token} value={token} asChild>
          <Swatch token={token} label={name} selected={value === token} />
        </RRadio.Item>
      ))}
    </RRadio.Root>
  );
}

export const USER_COLOR_LIST = USER_COLORS;

/** The same picker inside a flat scrap popover (Radix Popover), triggered by the current colour. */
export function ColorPickerPopover({
  value,
  onChange,
  colors = BORDER_COLORS,
  label = "Border colour",
  columns,
}: {
  value: string;
  onChange: (token: string) => void;
  colors?: readonly (string | [string, string])[];
  label?: string;
  columns?: number;
}) {
  const { t } = useTranslation();
  return (
    <RPopover.Root>
      <RPopover.Trigger asChild>
        <Swatch
          token={value}
          label={`${label}: ${t(`colours.${value}`, { defaultValue: COLOR_NAMES[value] ?? value })}`}
        />
      </RPopover.Trigger>
      <RPopover.Portal>
        <RPopover.Content asChild sideOffset={8} align="start">
          <Paper
            seed="color-popover"
            size="md"
            tone="scrap"
            rotate={0.4}
            className="z-50"
            faceStyle={{ padding: "18px 20px 20px" }}
          >
            <div className="zf-h2" style={{ fontSize: 17, marginBottom: 12 }}>
              {label}
            </div>
            <ColorPicker
              value={value}
              onChange={onChange}
              colors={colors}
              columns={columns}
              label={label}
            />
          </Paper>
        </RPopover.Content>
      </RPopover.Portal>
    </RPopover.Root>
  );
}

/**
 * A colour choice folded into a drop-down, for a phone: a torn chip showing the colour and its name,
 * which opens the swatches in a small scrap. Choosing one closes it.
 */
export function ColorDropdown({
  value,
  onChange,
  colors = USER_COLORS,
  label,
  seed = "",
}: {
  value: string;
  onChange: (token: string) => void;
  colors?: readonly (string | [string, string])[];
  label: string;
  seed?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const name = t(`colours.${value}`, { defaultValue: COLOR_NAMES[value] ?? value });
  return (
    <RPopover.Root open={open} onOpenChange={setOpen}>
      <RPopover.Trigger asChild>
        <Chip seed={seed + "cd"} className="zf-select" aria-label={`${label}: ${name}`}>
          <span
            aria-hidden="true"
            className="zf-colordot"
            style={{ background: hex(value) }}
          />
          <span className="zf-select__value">{name}</span>
          <Icon name="chevron" style={{ width: 16, height: 16 }} />
        </Chip>
      </RPopover.Trigger>
      <RPopover.Portal>
        <RPopover.Content asChild sideOffset={8} align="start" collisionPadding={12}>
          <Paper
            seed={seed + "cdp"}
            size="md"
            tone="scrap"
            rotate={0}
            className="zf-colormenu z-50"
            faceStyle={{ padding: "16px 14px 16px" }}
          >
            <ColorPicker
              value={value}
              onChange={(v) => {
                onChange(v);
                setOpen(false);
              }}
              colors={colors}
              label={label}
            />
          </Paper>
        </RPopover.Content>
      </RPopover.Portal>
    </RPopover.Root>
  );
}
