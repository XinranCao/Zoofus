import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  TransformComponent,
  TransformWrapper,
  useControls,
  useTransformEffect,
} from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { loadImage } from "@/paper/renderSticker";
import { canvasToPng, downloadBlob, pngName } from "../studio/export";
import type { Sticker } from "./sticker.schema";

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 8;

/** Zoom buttons plus the current level; must render inside <TransformWrapper>. */
function ZoomControls() {
  const { t } = useTranslation();
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const [scale, setScale] = useState(1);
  useTransformEffect(({ state }) => setScale(state.scale));
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 8,
      }}
    >
      <Button
        variant="quiet"
        size="sm"
        icon="zoomOut"
        seed="zo"
        aria-label={t("book.zoomOut")}
        disabled={scale <= MIN_ZOOM + 1e-6}
        onClick={() => zoomOut()}
      />
      <output aria-live="polite" style={{ minWidth: 56, textAlign: "center" }}>
        {Math.round(scale * 100)}%
      </output>
      <Button
        variant="quiet"
        size="sm"
        icon="zoomIn"
        seed="zi"
        aria-label={t("book.zoomIn")}
        disabled={scale >= MAX_ZOOM - 1e-6}
        onClick={() => zoomIn()}
      />
      <Button variant="quiet" size="sm" seed="zr" onClick={() => resetTransform()}>
        {t("common.reset")}
      </Button>
    </div>
  );
}

/**
 * The sticker-book detail dialog (560): the sticker at 0° with zoom and pan (buttons, wheel,
 * double click, pinch), then Delete / Rename / Edit edge / Download PNG.
 */
export function StickerDetailDialog({
  sticker,
  date,
  onClose,
  onRename,
  onDelete,
  onEditEdge,
  onOpenLibrary,
}: {
  sticker: Sticker | null;
  date: string;
  onClose: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onEditEdge?: () => void;
  /** Where the sticker lives (when it is previewed from another page). */
  onOpenLibrary?: () => void;
}) {
  const { t } = useTranslation();
  const download = async () => {
    if (!sticker) return;
    const img = await loadImage(sticker.imageUrl, "anonymous");
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d")?.drawImage(img, 0, 0);
    downloadBlob(await canvasToPng(canvas), pngName(sticker.name));
  };

  return (
    <Dialog
      open={sticker !== null}
      onOpenChange={(o) => !o && onClose()}
      width={560}
      seed="detail"
      kicker={
        sticker && t("book.detailKicker", { date, w: sticker.width, h: sticker.height })
      }
      title={sticker?.name ?? ""}
      actions={
        sticker && (
          <>
            {onDelete && (
              <Button variant="danger" icon="trash" seed="ddl" onClick={onDelete}>
                {t("common.delete")}
              </Button>
            )}
            <span style={{ flex: 1 }} />
            {onRename && (
              <Button variant="secondary" icon="pencil" seed="drn" onClick={onRename}>
                {t("common.rename")}
              </Button>
            )}
            {onOpenLibrary && (
              <Button variant="quiet" icon="folder" seed="dol" onClick={onOpenLibrary}>
                {t("book.openLibrary")}
              </Button>
            )}
            {onEditEdge && sticker.kind === "editable" && (
              <Button variant="secondary" icon="pen" seed="dee" onClick={onEditEdge}>
                {t("book.editEdge")}
              </Button>
            )}
            <Button
              variant="primary"
              icon="download"
              seed="ddw"
              onClick={() => void download()}
            >
              {t("book.download")}
            </Button>
          </>
        )
      }
    >
      {sticker && (
        // Keyed so each sticker opens at 100%
        <TransformWrapper
          key={sticker.id}
          minScale={MIN_ZOOM}
          maxScale={MAX_ZOOM}
          initialScale={1}
          centerOnInit
          doubleClick={{ mode: "toggle", step: 2 }}
          wheel={{ step: 0.15 }}
        >
          <div
            className="zf-ground"
            style={{ margin: "14px 0 6px", overflow: "hidden", touchAction: "none" }}
          >
            <TransformComponent
              wrapperStyle={{ width: "100%", height: "min(46vh, 340px)" }}
              contentStyle={{
                width: "100%",
                height: "100%",
                display: "grid",
                placeItems: "center",
              }}
            >
              <img
                src={sticker.imageUrl}
                alt={sticker.name}
                draggable={false}
                style={{
                  maxWidth: "80%",
                  maxHeight: "min(40vh, 300px)",
                  display: "block",
                }}
              />
            </TransformComponent>
          </div>
          <ZoomControls />
          {onEditEdge && sticker.kind === "legacy" && (
            <p className="zf-muted" style={{ margin: "10px 0 0" }}>
              {t("book.legacyNote")}
            </p>
          )}
        </TransformWrapper>
      )}
    </Dialog>
  );
}
