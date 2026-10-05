import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Reel } from "@/components/ui/Loader";
import { Paper } from "@/components/ui/Paper";
import { useElementWidth } from "@/lib/useElementWidth";
import { selectionBoxPercent } from "../domain/geometry";
import { useEditor } from "../store/editorStore";
import { useEditorImage } from "../useEditorImage";
import { useImageIntake } from "../useImageIntake";
import { LassoStage } from "./LassoStage";

/** Says what is selected, in words, after every change (a polite live region, for screen readers). */
function SelectionAnnouncer() {
  const { t } = useTranslation();
  const { fit } = useEditorImage();
  const selections = useEditor((s) => s.selections);
  const activeId = useEditor((s) => s.activeId);
  const previous = useEditor((s) => s.past[s.past.length - 1]);
  const active = selections.find((s) => s.id === activeId);
  let text = "";
  if (active) {
    text = t("maker.announce.selected", {
      shape: t(`maker.shapes.${active.kind}`),
      mode: t(active.mode === "select" ? "maker.select" : "maker.deselect"),
      ...selectionBoxPercent(active, fit),
    });
  } else if (previous && previous.length > selections.length) {
    text = t("maker.announce.removed", { count: selections.length });
  } else if (selections.length === 0) {
    text = t("maker.announce.none");
  }
  return (
    <div className="sr-only" role="status" aria-live="polite">
      {text}
    </div>
  );
}

/**
 * The photo well in the sticker maker: the photo, the outside dimmed and a marching-ants
 * selection. A 4:3 stage on a `field` sheet. Empty: a dashed hand-drawn drop zone. Loading: the
 * tape reel on sage.
 */
export function LassoCanvas() {
  const { t } = useTranslation();
  const imageUrl = useEditor((s) => s.imageUrl);
  const status = useEditor((s) => s.imageStatus);
  const intake = useImageIntake();
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const pick = (file?: File | null) => {
    if (file) void intake(file);
  };
  const loading = status === "loading";

  return (
    <>
      <Paper seed="well" size="md" rotate={0} w={600} h={440} className="zf-well">
        <div
          ref={ref}
          className={"zf-dropzone" + (over ? " is-over" : "")}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            pick(e.dataTransfer.files[0]);
          }}
          style={{
            position: "relative",
            aspectRatio: "4 / 3",
            background: "var(--field)",
            overflow: "hidden",
          }}
          data-testid="lasso-well"
        >
          {loading ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                background: "var(--sage-100)",
              }}
            >
              <Reel label={t("maker.loading")} />
            </div>
          ) : imageUrl ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
              }}
            >
              {width > 0 && <LassoStage width={width} height={(width * 3) / 4} />}
            </div>
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                textAlign: "center",
                padding: 16,
              }}
            >
              <svg
                viewBox="0 0 100 75"
                preserveAspectRatio="none"
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 12,
                  width: "calc(100% - 24px)",
                  height: "calc(100% - 24px)",
                }}
              >
                <rect
                  x={1}
                  y={1}
                  width={98}
                  height={73}
                  fill="none"
                  stroke="var(--cocoa-800)"
                  strokeOpacity={0.45}
                  strokeWidth={1.4}
                  strokeDasharray="6 4 2 5 8 4"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div style={{ position: "relative" }}>
                <Icon
                  name="upload"
                  style={{ width: 34, height: 34, color: "var(--ink)" }}
                />
                <div className="zf-h2" style={{ margin: "8px 0 4px" }}>
                  {t("maker.empty.drop")}
                </div>
                <div className="zf-muted" style={{ marginBottom: 14 }}>
                  {t("maker.empty.hint")}
                </div>
                <Button
                  variant="secondary"
                  icon="upload"
                  seed="pick"
                  onClick={() => input.current?.click()}
                >
                  {t("maker.empty.choose")}
                </Button>
              </div>
            </div>
          )}
          <input
            ref={input}
            type="file"
            accept="image/*"
            hidden
            aria-label={t("maker.empty.choose")}
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </Paper>
      {imageUrl && !loading && (
        <>
          <p
            id="maker-keys"
            className="zf-muted"
            style={{ margin: "10px 0 0", fontSize: 13 }}
          >
            {t("maker.hint.keys")}
          </p>
          <SelectionAnnouncer />
        </>
      )}
    </>
  );
}
