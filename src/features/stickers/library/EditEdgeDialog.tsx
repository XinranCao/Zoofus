import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Reel } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/Toast";
import {
  DEFAULT_EDGE,
  loadImage,
  renderSticker,
  type EdgeSpec,
} from "@/paper/renderSticker";
import { readPicture } from "@/lib/storage";
import { decodeOutline, rebuildSource } from "../editor/domain/outline";
import { StickerEdgeStudio } from "../studio/StickerEdgeStudio";
import type { Sticker } from "./sticker.schema";
import { useUpdateStickerEdge } from "./useStickers";

/** "Edit edge": the edge studio on a saved sticker's edge-less source. */
export function EditEdgeDialog({
  sticker,
  onClose,
}: {
  sticker: Sticker | null;
  onClose: () => void;
}) {
  // Keyed, so each sticker starts from its own saved edge.
  return sticker ? (
    <EditEdgeBody key={sticker.id} sticker={sticker} onClose={onClose} />
  ) : null;
}

/** Load a picture for drawing; if the browser refuses the direct load, read it through Storage. */
async function loadWithFallback(url: string): Promise<HTMLImageElement> {
  try {
    return await loadImage(url, "anonymous");
  } catch {
    const blob = await readPicture(url);
    const local = URL.createObjectURL(blob);
    try {
      return await loadImage(local);
    } finally {
      URL.revokeObjectURL(local);
    }
  }
}

function EditEdgeBody({ sticker, onClose }: { sticker: Sticker; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const update = useUpdateStickerEdge();
  const [source, setSource] = useState<HTMLCanvasElement | null>(null);
  const [edge, setEdge] = useState<EdgeSpec>(sticker.edge ?? DEFAULT_EDGE);
  const sourceUrl = sticker.sourceUrl;
  const outline = useMemo(() => decodeOutline(sticker.outline), [sticker.outline]);
  const cut = sticker.cut;
  // older stickers keep the cut-out as a second picture; newer ones keep only its outline
  const [failed, setFailed] = useState(!sourceUrl && !(outline && cut));
  const [reason, setReason] = useState<string | null>(null);
  const seed = sticker.seed ?? sticker.id;

  useEffect(() => {
    if (sourceUrl || !outline || !cut) return;
    let alive = true;
    loadWithFallback(sticker.imageUrl)
      .then((img) => {
        if (alive) setSource(rebuildSource(img, cut, outline));
      })
      .catch(() => {
        if (!alive) return;
        console.error("Could not open the sticker", sticker.imageUrl);
        setReason("source");
        setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [sourceUrl, outline, cut, sticker.imageUrl]);

  useEffect(() => {
    if (!sourceUrl) return;
    let alive = true;
    loadWithFallback(sourceUrl)
      .then((img) => {
        if (!alive) return;
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext("2d")?.drawImage(img, 0, 0);
        setSource(c);
      })
      .catch(() => {
        if (!alive) return;
        console.error("Could not open the sticker's original", sourceUrl);
        setReason("source");
        setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [sourceUrl]);

  const save = async () => {
    if (!source) return;
    try {
      const canvas = await renderSticker(source, edge, seed);
      await update.mutateAsync({
        sticker,
        canvas,
        edge,
        seed,
        ...(!sourceUrl && outline
          ? { cutSize: { w: outline.width, h: outline.height } }
          : {}),
      });
      toast.push({
        kind: "success",
        title: t("book.editEdgeSaved"),
        body: t("book.editEdgeSavedFor", { name: sticker.name }),
      });
      onClose();
      // focus goes to the sticker that was edited, not back to a button that is gone
      setTimeout(() => {
        document
          .querySelector<HTMLElement>(`[data-sticker-id="${sticker.id}"] .zf-tile__open`)
          ?.focus();
      }, 150);
    } catch (err) {
      // the cause is shown (a short code) so a report says what actually went wrong
      const code = (err as { code?: string }).code ?? (err as Error).name ?? "error";
      console.error("Editing the edge failed", err);
      toast.push({
        kind: "error",
        title: t("auth.errors.toastTitle"),
        body: `${t("book.editEdgeFailed")} (${code})`,
      });
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      width={1040}
      seed="edit-edge"
      sheet
      title={t("book.editEdgeTitle")}
      kicker={sticker.name}
      actions={
        <>
          <Button variant="quiet" seed="eec" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            icon="check"
            seed="ees"
            disabled={!source}
            loading={update.isPending}
            onClick={() => void save()}
          >
            {update.isPending ? t("maker.edge.saving") : t("book.editEdgeSave")}
          </Button>
        </>
      }
    >
      <div style={{ margin: "10px 0 22px" }}>
        {failed ? (
          <p>
            {reason === "source" ? t("book.editEdgeNoSource") : t("book.editEdgeFailed")}
          </p>
        ) : !source ? (
          <div
            style={{
              minHeight: 320,
              display: "grid",
              placeItems: "center",
              background: "var(--sage-100)",
            }}
          >
            <Reel label={t("book.loadingSource")} />
          </div>
        ) : (
          <StickerEdgeStudio
            source={source}
            edge={edge}
            seed={seed}
            onChange={(patch) => setEdge((e) => ({ ...e, ...patch }))}
          />
        )}
      </div>
    </Dialog>
  );
}
