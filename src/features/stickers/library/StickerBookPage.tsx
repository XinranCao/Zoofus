import { cn } from "@/lib/cn";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingNote, Skeleton } from "@/components/ui/Loader";
import { PageHeader } from "@/components/ui/PageHeader";
import { LibraryTabs } from "@/features/library/LibraryTabs";
import { useSearchParams } from "react-router-dom";
import { useMakeParam } from "@/lib/useMakeParam";
import { useSelection } from "@/lib/useSelection";
import { BulkBar } from "@/components/ui/BulkBar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AddToCollectionDialog } from "@/features/collections/AddToCollectionDialog";
import { ShareDialog } from "@/features/social/ShareDialog";
import { useForgetItems } from "@/features/collections/useCollections";
import { Sticker as DemoSticker } from "@/components/ui/Sticker";
import { ToastNote, useToast } from "@/components/ui/Toast";
import { preloadStickerMaker, StickerMakerDialog } from "../editor/LazyStickerMaker";
import { EditEdgeDialog } from "./EditEdgeDialog";
import { StickerDetailDialog } from "./StickerDetailDialog";
import { StickerTile, TILE_HEIGHT } from "./StickerTile";
import type { Sticker } from "./sticker.schema";
import {
  useDeleteSticker,
  useRenameSticker,
  useStickerById,
  useStickerPages,
  useStickerThumbHealing,
} from "./useStickers";

const UNDO_MS = 6000;
/** Past this many tiles the browser skips drawing the ones far off screen (`.is-long`). */
const LONG_GRID = 100;

export default function StickerBookPage() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const pages = useStickerPages();
  const { isPending, isError } = pages;
  const loaded = useMemo(
    () => pages.data?.pages.flatMap((p) => p.stickers),
    [pages.data],
  );
  useStickerThumbHealing(loaded);
  const remove = useDeleteSticker();
  const rename = useRenameSticker();

  const [detailId, setDetailId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [editEdgeId, setEditEdgeId] = useState<string | null>(null);
  const [makerOpen, setMakerOpen] = useState(false);
  const selection = useSelection();
  const forget = useForgetItems();
  const [addOpen, setAddOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareOne, setShareOne] = useState<Sticker | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  useMakeParam(() => setMakerOpen(true));
  // `/stickers?edit=<id>` (from "Edit edge" in the maker's saved step) opens that sticker's edge editor
  const [params, setParams] = useSearchParams();
  const wantedEdit = params.get("edit");
  // the linked sticker may be past the pages loaded so far: fetch it by itself
  const inPages = Boolean(wantedEdit && loaded?.some((s) => s.id === wantedEdit));
  const linked = useStickerById(
    wantedEdit,
    Boolean(wantedEdit) && !isPending && !inPages,
  );
  const data = useMemo(
    () => (linked.data && !inPages ? [linked.data, ...(loaded ?? [])] : loaded),
    [loaded, linked.data, inPages],
  );
  const openEdgeId =
    editEdgeId ??
    (wantedEdit && data?.some((s) => s.id === wantedEdit) ? wantedEdit : null);
  const closeEdge = () => {
    setEditEdgeId(null);
    if (wantedEdit) {
      const next = new URLSearchParams(params);
      next.delete("edit");
      setParams(next, { replace: true });
    }
  };
  // Deleted stickers disappear at once; the real delete runs after the Undo window.
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const pending = useRef(
    new Map<string, { timer: ReturnType<typeof setTimeout>; sticker: Sticker }>(),
  );

  const stickers = useMemo(
    () => (loaded ?? []).filter((s) => !hidden.has(s.id)),
    [loaded, hidden],
  );
  const find = (id: string | null) =>
    id ? ((data ?? []).find((s) => s.id === id) ?? null) : null;
  const date = (s: Sticker) =>
    new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" }).format(
      s.createdAt,
    );
  const longDate = (s: Sticker) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(s.createdAt);

  const runDelete = (sticker: Sticker) => {
    pending.current.delete(sticker.id);
    void forget([{ k: "sticker", id: sticker.id }]);
    remove.mutate(sticker, {
      onError: () => {
        setHidden((h) => {
          const n = new Set(h);
          n.delete(sticker.id);
          return n;
        });
        toast.push({
          kind: "error",
          title: t("auth.errors.toastTitle"),
          body: t("book.deleteFailed"),
        });
      },
    });
  };

  // Leaving the page finishes any delete that is still waiting for its Undo window.
  useEffect(() => {
    const map = pending.current;
    return () => {
      map.forEach(({ timer, sticker }) => {
        clearTimeout(timer);
        runDelete(sticker);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs on unmount only
  }, []);

  const confirmDelete = () => {
    const sticker = find(confirmId);
    setConfirmId(null);
    setDetailId(null);
    if (!sticker) return;
    setHidden((h) => new Set(h).add(sticker.id));
    const timer = setTimeout(() => runDelete(sticker), UNDO_MS);
    pending.current.set(sticker.id, { timer, sticker });
    toast.push({
      kind: "info",
      title: t("book.deleted"),
      body: t("book.deletedBody", { name: sticker.name }),
      action: {
        label: t("book.undo"),
        onClick: () => {
          clearTimeout(timer);
          pending.current.delete(sticker.id);
          setHidden((h) => {
            const n = new Set(h);
            n.delete(sticker.id);
            return n;
          });
        },
      },
    });
  };

  const onRenameDone = (id: string, name: string | null) => {
    setRenamingId(null);
    const sticker = find(id);
    if (!name || !sticker || name === sticker.name) return;
    rename.mutate(
      { id, name },
      {
        onError: () =>
          toast.push({
            kind: "error",
            title: t("auth.errors.toastTitle"),
            body: t("book.renameFailed"),
          }),
      },
    );
  };

  const empty = !isPending && !isError && stickers.length === 0;
  const detail = find(detailId);

  return (
    <div className="zf-page">
      <LibraryTabs />
      <PageHeader
        title={t("book.title")}
        lead={t("book.lead")}
        art={["star", "pear"]}
        actions={
          !empty && (
            <>
              {stickers.length > 0 && (
                <Button
                  variant="quiet"
                  icon="select"
                  seed="sel"
                  onClick={selection.active ? selection.stop : selection.start}
                >
                  {selection.active ? t("bulk.done") : t("bulk.select")}
                </Button>
              )}
              <Button
                variant="primary"
                icon="plus"
                seed="nw"
                onPointerEnter={preloadStickerMaker}
                onFocus={preloadStickerMaker}
                onClick={() => setMakerOpen(true)}
              >
                {t("book.newSticker")}
              </Button>
            </>
          )
        }
      />

      {isError && (
        <ToastNote
          kind="error"
          title={t("auth.errors.toastTitle")}
          body={t("book.loadError")}
          seed="book-error"
          role="alert"
        />
      )}
      {isPending && <LoadingNote text={t("book.loadingList")} />}
      {isPending && (
        <div className="zf-grid-book" aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} seed={"bsk" + i} width="100%" height={TILE_HEIGHT} />
          ))}
        </div>
      )}
      {empty && (
        <div style={{ paddingTop: 24 }}>
          <EmptyState
            seed="bk"
            title={t("book.emptyTitle")}
            art={<DemoSticker art="star" size={70} />}
            action={
              <Button
                variant="primary"
                icon="upload"
                seed="eu"
                onPointerEnter={preloadStickerMaker}
                onFocus={preloadStickerMaker}
                onClick={() => setMakerOpen(true)}
              >
                {t("book.makeFirst")}
              </Button>
            }
          >
            {t("book.emptyBody")}
          </EmptyState>
        </div>
      )}
      {stickers.length > 0 && (
        <div className={cn("zf-grid-book", stickers.length > LONG_GRID && "is-long")}>
          {stickers.map((s) => (
            <StickerTile
              key={s.id}
              sticker={s}
              size={168}
              date={t("book.cutOn", { date: date(s) })}
              onOpen={() => setDetailId(s.id)}
              onRename={() => setRenamingId(s.id)}
              onDelete={() => setConfirmId(s.id)}
              onShare={() => setShareOne(s)}
              onEditEdge={() => setEditEdgeId(s.id)}
              renaming={renamingId === s.id}
              onRenameDone={(name) => onRenameDone(s.id, name)}
              selecting={selection.active}
              selected={selection.ids.has(s.id)}
              onToggle={() => selection.toggle(s.id)}
            />
          ))}
        </div>
      )}

      {pages.hasNextPage && (
        <div style={{ display: "grid", placeItems: "center", margin: "20px 0 8px" }}>
          <Button
            variant="secondary"
            seed="showmore"
            loading={pages.isFetchingNextPage}
            onClick={() => void pages.fetchNextPage()}
          >
            {t("common.showMore")}
          </Button>
        </div>
      )}

      {selection.active && (
        <BulkBar
          count={selection.count}
          total={stickers.length}
          onSelectAll={() => selection.set(stickers.map((s) => s.id))}
          onClear={selection.clear}
          onDone={selection.stop}
        >
          <Button
            variant="secondary"
            size="sm"
            icon="folder"
            seed="bacol"
            disabled={selection.count === 0}
            onClick={() => setAddOpen(true)}
          >
            {t("bulk.addToCollection")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon="send"
            seed="bashare"
            disabled={selection.count === 0}
            onClick={() => setShareOpen(true)}
          >
            {t("bulk.share")}
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon="trash"
            seed="badel"
            disabled={selection.count === 0}
            onClick={() => setBulkDelete(true)}
          >
            {t("bulk.delete")}
          </Button>
        </BulkBar>
      )}
      <ShareDialog
        open={shareOpen || shareOne !== null}
        sources={(shareOne
          ? [shareOne]
          : (data ?? []).filter((s) => selection.ids.has(s.id))
        ).map((sticker) => ({ kind: "sticker" as const, sticker }))}
        onClose={() => {
          setShareOpen(false);
          setShareOne(null);
        }}
        onDone={selection.stop}
      />
      <AddToCollectionDialog
        open={addOpen}
        items={[...selection.ids].map((id) => ({ k: "sticker" as const, id }))}
        onClose={() => setAddOpen(false)}
        onDone={selection.stop}
      />
      <ConfirmDialog
        open={bulkDelete}
        title={t("book.bulkDeleteTitle", { count: selection.count })}
        body={t("book.deleteBody")}
        confirmLabel={t("common.delete")}
        loading={bulkBusy}
        onCancel={() => setBulkDelete(false)}
        onConfirm={() => {
          const chosen = (data ?? []).filter((s) => selection.ids.has(s.id));
          setBulkBusy(true);
          void Promise.allSettled(chosen.map((s) => remove.mutateAsync(s)))
            .then(async (results) => {
              const failed = results.filter((r) => r.status === "rejected").length;
              await forget(
                chosen
                  .filter((_, i) => results[i]!.status === "fulfilled")
                  .map((s) => ({ k: "sticker" as const, id: s.id })),
              );
              if (failed)
                toast.push({
                  kind: "error",
                  title: t("auth.errors.toastTitle"),
                  body: t("book.deleteFailed"),
                });
              else
                toast.push({
                  kind: "info",
                  title: t("book.deleted"),
                  body: t("book.bulkDeleted", { count: chosen.length }),
                });
            })
            .finally(() => {
              setBulkBusy(false);
              setBulkDelete(false);
              selection.stop();
            });
        }}
      />
      <StickerDetailDialog
        sticker={detail}
        date={detail ? longDate(detail) : ""}
        onClose={() => setDetailId(null)}
        onRename={() => {
          setRenamingId(detailId);
          setDetailId(null);
        }}
        onDelete={() => setConfirmId(detailId)}
        onEditEdge={() => {
          setEditEdgeId(detailId);
          setDetailId(null);
        }}
      />
      <EditEdgeDialog sticker={find(openEdgeId)} onClose={closeEdge} />
      <Dialog
        open={confirmId !== null}
        onOpenChange={(o) => !o && setConfirmId(null)}
        width={420}
        seed="confirm-delete"
        tapes={1}
        title={t("book.deleteTitle", { name: find(confirmId)?.name ?? "" })}
        actions={
          <>
            <Button variant="quiet" seed="cdc" onClick={() => setConfirmId(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" icon="trash" seed="cdd" onClick={confirmDelete}>
              {t("common.delete")}
            </Button>
          </>
        }
      >
        <DialogBody>{t("book.deleteBody")}</DialogBody>
      </Dialog>
      <StickerMakerDialog open={makerOpen} onOpenChange={setMakerOpen} />
    </div>
  );
}
