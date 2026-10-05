import { useTranslation } from "react-i18next";
import { PatternEditor } from "@/components/ui/PatternEditor";
import { Slider } from "@/components/ui/Slider";
import { StudioPreview } from "@/components/ui/StudioPreview";
import { Sticker } from "@/components/ui/Sticker";
import { ToggleGroup } from "@/components/ui/ToggleGroup";
import { edgeWidth, type EdgeShape } from "@/paper/dieCut";
import type { EdgeSpec } from "@/paper/renderSticker";

/**
 * The sticker edge editor, used as step 2 of the sticker maker and from "Edit edge" in the book.
 * The left stage is a notebook ground with the sticker at 0°, re-rendered live through dieCut
 * (at most once per frame). The right side sets the edge shape, width and fill.
 */
export function StickerEdgeStudio({
  source,
  edge,
  seed,
  onChange,
  previewSize = 300,
}: {
  /** The transparent, edge-less cut-out. */
  source: HTMLCanvasElement | null;
  edge: EdgeSpec;
  seed: string;
  onChange: (patch: Partial<EdgeSpec>) => void;
  previewSize?: number;
}) {
  const { t } = useTranslation();
  const long = source ? Math.max(source.width, source.height) : previewSize;
  // on a phone the preview takes about 40% of the screen height and stays in view while the
  // options below it are scrolled, so neither hides the other
  const phone =
    typeof window !== "undefined" && window.matchMedia?.("(max-width: 759px)").matches;
  const size = phone
    ? Math.max(120, Math.min(previewSize, Math.round(window.innerHeight * 0.4) - 32))
    : previewSize;
  return (
    <div className="zf-studio zf-studio--sticker">
      <StudioPreview>
        <div
          className="zf-studio__stage zf-ground"
          style={{
            display: "grid",
            placeItems: "center",
            minHeight: phone ? size + 32 : 320,
            padding: 16,
          }}
        >
          <Sticker
            source={source}
            size={size}
            rotate={0}
            seed={seed}
            edge={edge}
            label={t("maker.edge.preview")}
          />
        </div>
      </StudioPreview>
      <div className="zf-studio__controls">
        <div>
          <div className="zf-label" style={{ marginBottom: 8 }}>
            {t("maker.edge.shape")}
          </div>
          <ToggleGroup<EdgeShape>
            label={t("maker.edge.shape")}
            seed="es"
            value={edge.shape}
            options={(["smooth", "wobbly", "torn"] as const).map((s) => ({
              value: s,
              label: t(`maker.edge.shapes.${s}`),
            }))}
            onChange={(shape) => onChange({ shape })}
          />
        </div>
        <Slider
          label={t("maker.edge.width")}
          value={Math.round(edge.scale * 100)}
          min={0}
          max={160}
          step={10}
          seed="ew"
          onChange={(v) => onChange({ scale: v / 100 })}
          format={(v) =>
            v === 0 ? t("maker.edge.none") : `${edgeWidth(long, v / 100)} px`
          }
        />
        <PatternEditor
          label={t("maker.edge.fill")}
          seed="ef"
          value={edge.fill}
          onChange={(fill) => onChange({ fill })}
        />
      </div>
    </div>
  );
}
