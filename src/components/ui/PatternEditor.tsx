import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BLANK_PIXELS,
  DOODLE_STROKES,
  HEART_PIXELS,
  MAX_DOODLE_STROKES,
  MAX_STROKE_LENGTH,
  MIN_PRINT_CONTRAST,
  USER_COLORS,
  contrastRatio,
  hex,
  readableInk,
  type PatternKind,
  type PatternSpec,
} from "@/paper/pattern";
import { f1 } from "@/paper/random";
import { Button } from "./Button";
import { ColorPicker } from "./ColorPicker";
import { PatternFill } from "./Tape";
import { Slider } from "./Slider";
import { ToggleGroup } from "./ToggleGroup";

const KINDS: PatternKind[] = [
  "solid",
  "stripes",
  "dots",
  "gingham",
  "check",
  "wave",
  "pixels",
  "doodle",
];

/** An 8 × 8 pixel stamp: each cell is a button (`aria-pressed`, "Row 3 column 5"). */
export function PixelGrid({
  value,
  bg,
  ink,
  onChange,
}: {
  value: string[];
  bg: string;
  ink: string;
  onChange: (rows: string[]) => void;
}) {
  const { t } = useTranslation();
  // Press on a cell and drag: every cell the pointer crosses is set to what the first one became
  // (paint or erase), so a stroke colours a whole area.
  const paint = useRef<{ to: "0" | "1"; rows: string[] } | null>(null);
  const pressed = useRef(false);
  // one tab stop for the whole grid: arrow keys move between cells (the cell last used keeps the stop)
  const [at, setAt] = useState<[number, number]>([0, 0]);
  const size = value.length;
  const focusCell = (e: React.KeyboardEvent, y: number, x: number) => {
    const next = (
      e.currentTarget.parentElement as HTMLElement
    ).querySelector<HTMLElement>(`[data-cell="${y},${x}"]`);
    if (!next) return;
    e.preventDefault();
    setAt([y, x]);
    next.focus();
  };
  const onCellKey = (e: React.KeyboardEvent, y: number, x: number) => {
    const last = size - 1;
    if (e.key === "ArrowRight") focusCell(e, y, Math.min(last, x + 1));
    else if (e.key === "ArrowLeft") focusCell(e, y, Math.max(0, x - 1));
    else if (e.key === "ArrowDown") focusCell(e, Math.min(last, y + 1), x);
    else if (e.key === "ArrowUp") focusCell(e, Math.max(0, y - 1), x);
    else if (e.key === "Home") focusCell(e, y, 0);
    else if (e.key === "End") focusCell(e, y, last);
  };

  const cellOf = (el: Element | null) => {
    const cell = el?.closest<HTMLElement>("[data-cell]");
    if (!cell) return null;
    const [y, x] = cell.dataset.cell!.split(",").map(Number) as [number, number];
    return { x, y };
  };
  const setCell = (x: number, y: number) => {
    const st = paint.current;
    if (!st || st.rows[y]![x] === st.to) return;
    st.rows = st.rows.slice();
    st.rows[y] = st.rows[y]!.slice(0, x) + st.to + st.rows[y]!.slice(x + 1);
    onChange(st.rows);
  };
  const down = (e: React.PointerEvent) => {
    const c = cellOf(e.target as Element);
    if (!c || e.button > 0) return;
    pressed.current = true;
    paint.current = { to: value[c.y]![c.x] === "1" ? "0" : "1", rows: value };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setCell(c.x, c.y);
  };
  const move = (e: React.PointerEvent) => {
    if (!paint.current) return;
    const at =
      typeof document.elementFromPoint === "function"
        ? document.elementFromPoint(e.clientX, e.clientY)
        : null;
    const c = cellOf(at);
    if (c) setCell(c.x, c.y);
  };
  const up = () => {
    paint.current = null;
    // the click that follows a press is swallowed; clear the flag once it has had its chance
    setTimeout(() => (pressed.current = false), 0);
  };

  return (
    <div
      className="zf-pixels"
      role="group"
      aria-label={t("pattern.pixelGrid")}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      {value.map((row, y) =>
        row.split("").map((c, x) => (
          <button
            key={`${y}-${x}`}
            type="button"
            className="zf-pixel"
            data-cell={`${y},${x}`}
            aria-pressed={c === "1"}
            aria-label={t("pattern.cell", { row: y + 1, col: x + 1 })}
            tabIndex={at[0] === y && at[1] === x ? 0 : -1}
            onFocus={() => setAt([y, x])}
            onKeyDown={(e) => onCellKey(e, y, x)}
            style={{ background: c === "1" ? hex(ink) : hex(bg) }}
            onClick={() => {
              // a mouse or touch press was already handled on pointer down; this is the keyboard
              if (pressed.current) {
                pressed.current = false;
                return;
              }
              const rows = value.slice();
              rows[y] = row.slice(0, x) + (c === "1" ? "0" : "1") + row.slice(x + 1);
              onChange(rows);
            }}
          />
        )),
      )}
    </div>
  );
}

/** A freehand 48-unit tile the user draws with a finger or mouse; undo and clear. */
export function DoodlePad({
  value,
  bg,
  ink,
  weight,
  onChange,
}: {
  value: string[];
  bg: string;
  ink: string;
  weight: number;
  onChange: (strokes: string[]) => void;
}) {
  const { t } = useTranslation();
  const ref = useRef<SVGSVGElement>(null);
  const drawing = useRef<string | null>(null);
  const [live, setLive] = useState<string | null>(null);
  const point = (e: React.PointerEvent): [number, number] => {
    const b = ref.current!.getBoundingClientRect();
    return [
      f1(((e.clientX - b.left) / b.width) * 48),
      f1(((e.clientY - b.top) / b.height) * 48),
    ];
  };
  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    if (value.length >= MAX_DOODLE_STROKES) return;
    ref.current?.setPointerCapture(e.pointerId);
    const [x, y] = point(e);
    drawing.current = `M${x} ${y}`;
    setLive(drawing.current);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const [x, y] = point(e);
    const next = `${drawing.current} L${x} ${y}`;
    if (next.length > MAX_STROKE_LENGTH) return; // a stroke has a length limit; stop growing it
    drawing.current = next;
    setLive(next);
  };
  const up = () => {
    if (!drawing.current) return;
    onChange([...value, drawing.current]);
    drawing.current = null;
    setLive(null);
  };
  const strokes = live ? [...value, live] : value;
  const preview: PatternSpec = {
    kind: "doodle",
    bg: bg as PatternSpec["bg"],
    ink: ink as PatternSpec["ink"],
    scale: 6,
    weight,
    strokes,
  };
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
      <svg
        ref={ref}
        className="zf-doodle-pad"
        viewBox="0 0 48 48"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        role="img"
        aria-label={t("pattern.doodlePad")}
        style={{ background: hex(bg) }}
      >
        <g
          fill="none"
          stroke={hex(ink)}
          strokeWidth={1.2 + weight * 3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {strokes.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </svg>
      <div style={{ display: "grid", gap: 6 }}>
        <div className="zf-pattern-swatch" style={{ width: 96, height: 96 }}>
          <PatternFill spec={preview} />
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          <Button
            variant="quiet"
            size="sm"
            icon="undo"
            seed="dpu"
            onClick={() => onChange(value.slice(0, -1))}
          >
            {t("common.undo")}
          </Button>
          <Button
            variant="quiet"
            size="sm"
            icon="reset"
            seed="dpc"
            onClick={() => onChange([])}
          >
            {t("common.clear")}
          </Button>
        </div>
      </div>
    </div>
  );
}

const withDefaults = (v: Partial<PatternSpec>): PatternSpec => ({
  kind: "stripes",
  bg: "mustard-300",
  ink: "sheet-50",
  scale: 12,
  angle: 45,
  weight: 0.4,
  pixels: HEART_PIXELS,
  strokes: DOODLE_STROKES,
  ...v,
});

/**
 * Where users design a print: one editor for tape prints and sticker-edge fills. A controlled
 * component whose output is a PatternSpec. Pattern kinds are a radiogroup, pixels are buttons,
 * and the doodle pad is optional (presets and pixels cover keyboard-only users).
 */
export function PatternEditor({
  value,
  onChange,
  label,
  kinds = KINDS,
  seed = "",
}: {
  value: Partial<PatternSpec>;
  onChange: (spec: PatternSpec) => void;
  label: string;
  kinds?: PatternKind[];
  seed?: string;
}) {
  const { t } = useTranslation();
  const s = withDefaults(value);
  const ink = s.ink ?? "sheet-50";
  const update = <K extends keyof PatternSpec>(key: K, v: PatternSpec[K]) =>
    onChange({ ...s, [key]: v });
  // a pixel stamp is not turned: its cells stay on the grid
  const turns = s.kind !== "solid" && s.kind !== "pixels";
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <div className="zf-label" style={{ marginBottom: 8 }}>
          {label}
        </div>
        <ToggleGroup
          label={label}
          seed={"pk" + seed}
          value={s.kind}
          options={kinds.map((k) => ({ value: k, label: t(`pattern.kinds.${k}`) }))}
          onChange={(k) =>
            // a print the same colour as its paper looks like a blank sticker: start with an ink that shows
            onChange({
              ...s,
              kind: k,
              ...(k !== "solid" && contrastRatio(s.bg, ink) < MIN_PRINT_CONTRAST
                ? { ink: readableInk(s.bg) }
                : {}),
            })
          }
        />
      </div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div>
          <div className="zf-label" style={{ marginBottom: 8 }}>
            {s.kind === "solid" ? t("pattern.colour") : t("pattern.paper")}
          </div>
          <ColorPicker
            label={t("pattern.paperColour")}
            colors={USER_COLORS}
            columns={8}
            value={s.bg}
            onChange={(v) => update("bg", v as PatternSpec["bg"])}
          />
        </div>
        {s.kind !== "solid" && (
          <div>
            <div className="zf-label" style={{ marginBottom: 8 }}>
              {t("pattern.ink")}
            </div>
            <ColorPicker
              label={t("pattern.inkColour")}
              colors={USER_COLORS}
              columns={8}
              value={ink}
              onChange={(v) => update("ink", v as PatternSpec["ink"])}
            />
          </div>
        )}
      </div>
      {s.kind !== "solid" && contrastRatio(s.bg, ink) < MIN_PRINT_CONTRAST && (
        <p className="zf-muted" role="status" style={{ margin: "-6px 0 0" }}>
          {t("pattern.lowContrast")}
        </p>
      )}
      {s.kind !== "solid" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 18,
          }}
        >
          <Slider
            label={t("pattern.size")}
            value={s.scale ?? 12}
            min={6}
            max={28}
            unit=" px"
            seed={"ps" + seed}
            onChange={(v) => update("scale", v)}
          />
          {turns && (
            <Slider
              label={t("pattern.turn")}
              value={s.angle ?? 0}
              min={0}
              max={180}
              step={5}
              unit="°"
              seed={"pa" + seed}
              onChange={(v) => update("angle", v)}
            />
          )}
          {s.kind !== "check" && s.kind !== "pixels" && (
            <Slider
              label={t("pattern.weight")}
              value={Math.round((s.weight ?? 0.5) * 100)}
              min={10}
              max={90}
              unit="%"
              seed={"pw" + seed}
              onChange={(v) => update("weight", v / 100)}
            />
          )}
        </div>
      )}
      {s.kind === "pixels" && (
        <div style={{ display: "flex", gap: 14, alignItems: "start", flexWrap: "wrap" }}>
          <PixelGrid
            value={s.pixels ?? BLANK_PIXELS}
            bg={s.bg}
            ink={ink}
            onChange={(v) => update("pixels", v)}
          />
          <div style={{ display: "grid", gap: 6 }}>
            <div className="zf-pattern-swatch" style={{ width: 96, height: 96 }}>
              <PatternFill spec={s} />
            </div>
            <Button
              variant="quiet"
              size="sm"
              icon="reset"
              seed="pxc"
              onClick={() => update("pixels", BLANK_PIXELS)}
            >
              {t("common.clear")}
            </Button>
          </div>
        </div>
      )}
      {s.kind === "doodle" && (
        <DoodlePad
          value={s.strokes ?? []}
          bg={s.bg}
          ink={ink}
          weight={s.weight ?? 0.5}
          onChange={(v) => update("strokes", v)}
        />
      )}
    </div>
  );
}
