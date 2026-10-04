import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { TextField } from "@/components/ui/TextField";
import { ToggleGroup } from "@/components/ui/ToggleGroup";
import { USER_COLORS } from "@/paper/pattern";
import {
  PAGE_LIMITS,
  PAGE_SIZES,
  PAPERS,
  PATTERNS_BY_PAPER,
  patternFor,
  type PageSpec,
  type Paper,
} from "./journal.schema";
import { drawPaper } from "./paper";

/** A small look at the paper as it will be. */
export function PaperPreview({ page, width = 150 }: { page: PageSpec; width?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const height = Math.round((width * page.height) / page.width);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const paper = drawPaper(page, 360);
    c.width = width * 2;
    c.height = height * 2;
    c.getContext("2d")?.drawImage(paper, 0, 0, c.width, c.height);
  }, [page, width, height]);
  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={undefined}
      aria-hidden="true"
      style={{ width, height, display: "block" }}
    />
  );
}

const sizeKey = (p: PageSpec) =>
  PAGE_SIZES.find((s) => s.width === p.width && s.height === p.height)?.key ?? "custom";

/** Choose the paper: its size, what it is, what is printed on it, and its colour. */
export function PageSetup({
  value,
  onChange,
}: {
  value: PageSpec;
  onChange: (page: PageSpec) => void;
}) {
  const { t } = useTranslation();
  const [custom, setCustom] = useState(sizeKey(value) === "custom");
  const current = custom ? "custom" : sizeKey(value);
  const setNumber = (key: "width" | "height", raw: string) => {
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n)) return;
    onChange({
      ...value,
      [key]: Math.min(PAGE_LIMITS.max, Math.max(PAGE_LIMITS.min, n)),
    });
  };
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div>
        <div className="zf-label" style={{ marginBottom: 8 }}>
          {t("journal.setup.size")}
        </div>
        <ToggleGroup
          label={t("journal.setup.size")}
          seed="psz"
          value={current}
          options={[
            ...PAGE_SIZES.map((s) => ({
              value: s.key as string,
              label: t(`journal.setup.sizes.${s.key}`),
            })),
            { value: "custom", label: t("journal.setup.sizes.custom") },
          ]}
          onChange={(key) => {
            const preset = PAGE_SIZES.find((s) => s.key === key);
            setCustom(!preset);
            if (preset)
              onChange({ ...value, width: preset.width, height: preset.height });
          }}
        />
        {current === "custom" && (
          <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            <TextField
              label={t("journal.setup.width")}
              type="number"
              inputMode="numeric"
              min={PAGE_LIMITS.min}
              max={PAGE_LIMITS.max}
              seed="pw"
              value={value.width}
              onChange={(e) => setNumber("width", e.target.value)}
            />
            <TextField
              label={t("journal.setup.height")}
              type="number"
              inputMode="numeric"
              min={PAGE_LIMITS.min}
              max={PAGE_LIMITS.max}
              seed="ph"
              value={value.height}
              onChange={(e) => setNumber("height", e.target.value)}
            />
          </div>
        )}
      </div>
      <div>
        <div className="zf-label" style={{ marginBottom: 8 }}>
          {t("journal.setup.paper")}
        </div>
        <ToggleGroup<Paper>
          label={t("journal.setup.paper")}
          seed="ppp"
          value={value.paper}
          options={PAPERS.map((p) => ({
            value: p,
            label: t(`journal.setup.papers.${p}`),
          }))}
          onChange={(paper) =>
            onChange({ ...value, paper, pattern: patternFor(paper, value.pattern) })
          }
        />
      </div>
      <div>
        <div className="zf-label" style={{ marginBottom: 8 }}>
          {t("journal.setup.pattern")}
        </div>
        <ToggleGroup
          label={t("journal.setup.pattern")}
          seed="ppt"
          value={value.pattern}
          options={PATTERNS_BY_PAPER[value.paper].map((p) => ({
            value: p,
            label: t(`journal.setup.patterns.${p}`),
          }))}
          onChange={(pattern) =>
            onChange({ ...value, pattern: pattern as PageSpec["pattern"] })
          }
        />
      </div>
      <div>
        <div className="zf-label" style={{ marginBottom: 8 }}>
          {t("journal.setup.colour")}
        </div>
        <ColorPicker
          label={t("journal.setup.colour")}
          colors={USER_COLORS}
          columns={8}
          value={value.color}
          onChange={(color) => onChange({ ...value, color: color as PageSpec["color"] })}
        />
      </div>
    </div>
  );
}
