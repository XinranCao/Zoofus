import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody } from "@/components/ui/Dialog";
import { ToastNote, useToast } from "@/components/ui/Toast";
import { StickerLimitError } from "@/features/stickers/library/sticker.schema";
import { useSaveSticker } from "@/features/stickers/library/useStickers";
import { renderSticker } from "@/paper/renderSticker";
import { StickerEdgeStudio } from "../studio/StickerEdgeStudio";
import { canvasToPng, downloadBlob } from "../studio/export";
import { renderCutoutSource } from "./domain/cutout";
import { computeMaskPolygons, isMaskEmpty } from "./domain/mask";
import { LassoCanvas } from "./components/LassoCanvas";
import { MakerTools } from "./components/MakerTools";
import { EditorStoreProvider, useEditor } from "./store/editorStore";
import { useEditorImage } from "./useEditorImage";
import { useImageIntake } from "./useImageIntake";

/**
 * The sticker maker: a taped dialog (a full-bleed sheet under 760px). Step 1 draws the selection,
 * step 2 is the edge studio. It owns the photo's object URL and revokes it when the photo changes
 * or the maker closes. Unsaved work asks before it is thrown away.
 */
export function StickerMakerDialog({
  open,
  onOpenChange,
  initialFile,
  onAvatar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A photo dropped on Home or picked there; opens straight into the maker. */
  initialFile?: File | null;
  /**
   * Makes the maker produce a profile picture instead of a sticker for the book: the last step
   * offers "Use as my picture", and this receives the finished die-cut sticker.
   */
  onAvatar?: (sticker: HTMLCanvasElement) => Promise<void>;
}) {
  // Unmounting on close gives every visit a fresh editor.
  if (!open) return null;
  return (
    <EditorStoreProvider>
      <MakerBody
        onClose={() => onOpenChange(false)}
        initialFile={initialFile}
        onAvatar={onAvatar}
      />
    </EditorStoreProvider>
  );
}

function MakerBody({
  onClose,
  initialFile,
  onAvatar,
}: {
  onClose: () => void;
  initialFile?: File | null;
  onAvatar?: (sticker: HTMLCanvasElement) => Promise<void>;
}) {
  const [usingPicture, setUsingPicture] = useState(false);
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const intake = useImageIntake();
  const save = useSaveSticker();
  const { image, fit } = useEditorImage();

  const imageUrl = useEditor((s) => s.imageUrl);
  const status = useEditor((s) => s.imageStatus);
  const imageError = useEditor((s) => s.imageError);
  const view = useEditor((s) => s.view);
  const selections = useEditor((s) => s.selections);
  const edge = useEditor((s) => s.edge);
  const seed = useEditor((s) => s.seed);
  const confirm = useEditor((s) => s.confirm);
  const backToEdit = useEditor((s) => s.backToEdit);
  const setEdge = useEditor((s) => s.setEdge);

  const [leaving, setLeaving] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  // A photo handed over from Home.
  useEffect(() => {
    if (initialFile) void intake(initialFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on first mount
  }, []);

  // This component owns the object URL: revoke it when the photo is replaced or the maker closes.
  useEffect(
    () => () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    },
    [imageUrl],
  );

  const mask = useMemo(
    () => computeMaskPolygons(selections, fit, fit),
    [selections, fit],
  );
  const canCut = !isMaskEmpty(mask);

  // The edge-less cut-out, cropped to the selection, for step 2.
  const source = useMemo(() => {
    if (view !== "result" || !image) return null;
    const imageMask = computeMaskPolygons(selections, fit, {
      width: image.naturalWidth,
      height: image.naturalHeight,
    });
    return renderCutoutSource(image, imageMask);
  }, [view, image, selections, fit]);

  const editKey = JSON.stringify([edge, seed, selections.map((s) => s.id)]);
  const saved = savedKey === editKey;
  const dirty = selections.length > 0 && !saved;
  const requestClose = () => (dirty ? setLeaving(true) : onClose());

  const stage = !imageUrl ? "empty" : view === "result" ? "result" : "lasso";
  const title = onAvatar
    ? t(`maker.avatarTitle.${status === "loading" ? "empty" : stage}`)
    : t(`maker.title.${status === "loading" ? "empty" : stage}`);
  const kicker = view === "result" ? t("maker.kicker2") : t("maker.kicker1");

  const bake = async () => {
    if (!source) throw new Error("No cut-out");
    return renderSticker(source, edge, seed);
  };

  const onSave = async () => {
    if (!source) return;
    try {
      const sticker = await bake();
      const date = new Intl.DateTimeFormat(i18n.language, {
        day: "numeric",
        month: "short",
      }).format(new Date());
      await save.mutateAsync({
        name: t("maker.edge.defaultName", { date }),
        sticker,
        source,
        edge,
        seed,
      });
      setSavedKey(editKey);
      toast.push({
        kind: "success",
        title: t("maker.edge.saved"),
        body: t("maker.edge.savedBody"),
      });
    } catch (err) {
      const body =
        err instanceof StickerLimitError
          ? t(err.code === "count" ? "maker.errors.limit" : "maker.errors.tooBig")
          : t("maker.errors.save");
      toast.push({ kind: "error", title: t("auth.errors.toastTitle"), body });
    }
  };

  const onDownload = async () => {
    const sticker = await bake();
    downloadBlob(await canvasToPng(sticker), "zoofus-sticker.png");
  };

  const onUsePicture = async () => {
    if (!source || !onAvatar) return;
    setUsingPicture(true);
    try {
      await onAvatar(await bake());
      onClose();
    } catch (err) {
      console.error("Setting the profile picture failed", err);
      toast.push({
        kind: "error",
        title: t("auth.errors.toastTitle"),
        body: t("account.pictureFailed"),
      });
    } finally {
      setUsingPicture(false);
    }
  };

  const actions =
    view === "result" && onAvatar ? (
      <>
        <Button variant="quiet" icon="undo" seed="ba" onClick={backToEdit}>
          {t("maker.edge.back")}
        </Button>
        <Button
          variant="primary"
          icon="check"
          seed="usepic"
          disabled={!source}
          loading={usingPicture}
          onClick={() => void onUsePicture()}
        >
          {usingPicture ? t("maker.edge.saving") : t("account.usePicture")}
        </Button>
      </>
    ) : view === "result" ? (
      <>
        <Button variant="quiet" icon="undo" seed="ba" onClick={backToEdit}>
          {t("maker.edge.back")}
        </Button>
        <Button
          variant="secondary"
          icon="book"
          seed="sv"
          disabled={saved || !source}
          loading={save.isPending}
          onClick={onSave}
        >
          {save.isPending ? t("maker.edge.saving") : t("maker.edge.save")}
        </Button>
        <Button
          variant="primary"
          icon="download"
          seed="dlp"
          disabled={!source}
          onClick={() => void onDownload()}
        >
          {t("maker.edge.download")}
        </Button>
      </>
    ) : (
      <>
        <Button variant="quiet" seed="cn" onClick={requestClose}>
          {t("common.cancel")}
        </Button>
        <Button
          variant="primary"
          icon="check"
          seed="cf"
          disabled={!canCut}
          onClick={confirm}
        >
          {t("maker.cutIt")}
        </Button>
      </>
    );

  return (
    <>
      <Dialog
        open
        sheet
        onOpenChange={(o) => !o && requestClose()}
        onEscapeKeyDown={(e) => {
          if (dirty) {
            e.preventDefault();
            setLeaving(true);
          }
        }}
        onInteractOutside={(e) => e.preventDefault()}
        width={1040}
        seed="maker"
        kicker={kicker}
        title={title}
        actions={actions}
      >
        {status === "error" && imageError && (
          <div style={{ margin: "6px 0 14px" }}>
            <ToastNote
              kind="error"
              title={t("maker.errors.title")}
              body={imageError}
              seed="maker-error"
              role="alert"
            />
          </div>
        )}
        {view === "result" ? (
          <div style={{ marginTop: 10, marginBottom: 22 }}>
            <StickerEdgeStudio
              source={source}
              edge={edge}
              seed={seed}
              onChange={setEdge}
            />
          </div>
        ) : (
          <div
            style={{ display: "flex", gap: 28, flexWrap: "wrap", margin: "10px 0 22px" }}
          >
            <div style={{ flex: "1 1 300px", minWidth: 0 }}>
              <LassoCanvas />
            </div>
            <div style={{ flex: "1 1 240px", maxWidth: 360 }}>
              <MakerTools disabled={!imageUrl} />
            </div>
          </div>
        )}
      </Dialog>
      <Dialog
        open={leaving}
        onOpenChange={setLeaving}
        width={420}
        seed="leave"
        tapes={1}
        title={t("maker.leave.title")}
        actions={
          <>
            <Button variant="quiet" seed="lk" onClick={() => setLeaving(false)}>
              {t("maker.leave.keep")}
            </Button>
            <Button variant="danger" seed="ld" onClick={onClose}>
              {t("maker.leave.discard")}
            </Button>
          </>
        }
      >
        <DialogBody>{t("maker.leave.body")}</DialogBody>
      </Dialog>
    </>
  );
}
