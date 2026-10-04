import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { BulkBar } from "@/components/ui/BulkBar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sticker as Art } from "@/components/ui/Sticker";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { JournalTile } from "@/features/journal/JournalTile";
import { useJournals } from "@/features/journal/useJournals";
import type { Journal } from "@/features/journal/journal.schema";
import type { Sticker as StickerType } from "@/features/stickers/library/sticker.schema";
import type { Tape } from "@/features/tape/tape.schema";
import { StickerDetailDialog } from "@/features/stickers/library/StickerDetailDialog";
import { StickerTile } from "@/features/stickers/library/StickerTile";
import { useStickers } from "@/features/stickers/library/useStickers";
import { TapeTile } from "@/features/tape/TapeTile";
import { useTapes } from "@/features/tape/useTapes";
import { useSelection } from "@/lib/useSelection";
import { itemKey, MAX_COLLECTION_NAME, type CollectionItem } from "./collection.schema";
import {
  useCollections,
  useDeleteCollection,
  useRemoveFromCollection,
  useRenameCollection,
} from "./useCollections";

type Resolved =
  | { item: CollectionItem; sticker: StickerType }
  | { item: CollectionItem; tape: Tape }
  | { item: CollectionItem; journal: Journal };

/** `/collections/:id`: what is in one of your collections. */
export default function CollectionPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: collections, isPending } = useCollections();
  const { data: stickers } = useStickers();
  const { data: tapes } = useTapes();
  const { data: journals } = useJournals();
  const rename = useRenameCollection();
  const remove = useDeleteCollection();
  const take = useRemoveFromCollection();
  const selection = useSelection();
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const collection = collections?.find((c) => c.id === id);
  const loaded = Boolean(stickers && tapes && journals);

  const resolved = useMemo(() => {
    if (!collection) return [];
    const s = new Map((stickers ?? []).map((x) => [x.id, x]));
    const tp = new Map((tapes ?? []).map((x) => [x.id, x]));
    const j = new Map((journals ?? []).map((x) => [x.id, x]));
    return collection.items.flatMap((item): Resolved[] => {
      if (item.k === "sticker")
        return s.has(item.id) ? [{ item, sticker: s.get(item.id)! }] : [];
      if (item.k === "tape")
        return tp.has(item.id) ? [{ item, tape: tp.get(item.id)! }] : [];
      return j.has(item.id) ? [{ item, journal: j.get(item.id)! }] : [];
    });
  }, [collection, stickers, tapes, journals]);

  // things deleted elsewhere quietly leave the collection
  useEffect(() => {
    if (!collection || !loaded) return;
    const live = new Set(resolved.map((r) => itemKey(r.item)));
    const gone = collection.items.filter((i) => !live.has(itemKey(i)));
    if (gone.length) take.mutate({ id: collection.id, items: gone });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once the lists have loaded
  }, [loaded, collection?.id]);

  if (isPending) return <div className="zf-page" aria-busy="true" />;
  if (!collection)
    return (
      <div className="zf-page">
        <EmptyState
          seed="col-missing"
          title={t("collections.missingTitle")}
          action={
            <Button
              variant="primary"
              seed="colm"
              onClick={() => navigate("/collections")}
            >
              {t("collections.backToAll")}
            </Button>
          }
        >
          {t("collections.missingBody")}
        </EmptyState>
      </div>
    );

  const date = (d: Date) =>
    new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" }).format(d);
  const chosen: CollectionItem[] = resolved
    .filter((r) => selection.ids.has(itemKey(r.item)))
    .map((r) => r.item);
  const preview = (stickers ?? []).find((s) => s.id === previewId) ?? null;

  return (
    <div className="zf-page">
      <div style={{ marginBottom: 6 }}>
        <Link to="/collections" className="zf-backlink">
          {t("collections.backToAll")}
        </Link>
      </div>
      <PageHeader
        title={collection.name}
        lead={t("collections.count", { count: resolved.length })}
        art={["folder"]}
        actions={
          <>
            <Button
              variant="quiet"
              icon="pencil"
              seed="colrn"
              onClick={() => {
                setName(collection.name);
                setRenameOpen(true);
              }}
            >
              {t("common.rename")}
            </Button>
            {resolved.length > 0 && (
              <Button
                variant="quiet"
                icon="select"
                seed="colsel"
                onClick={selection.active ? selection.stop : selection.start}
              >
                {selection.active ? t("bulk.done") : t("bulk.select")}
              </Button>
            )}
            <Button
              variant="danger"
              icon="trash"
              seed="coldel"
              onClick={() => setDeleteOpen(true)}
            >
              {t("collections.deleteCollection")}
            </Button>
          </>
        }
      />

      {resolved.length === 0 ? (
        <EmptyState
          seed="col-empty"
          title={t("collections.emptyOneTitle")}
          art={<Art art="folder" size={70} />}
        >
          {t("collections.emptyOneBody")}
        </EmptyState>
      ) : (
        <div className="zf-grid-journal">
          {resolved.map((r, i) => {
            const key = itemKey(r.item);
            const picked = selection.ids.has(key);
            if ("sticker" in r)
              return (
                <StickerTile
                  key={key}
                  sticker={r.sticker}
                  size={92}
                  date={date(r.sticker.createdAt)}
                  onOpen={() => setPreviewId(r.sticker.id)}
                  selecting={selection.active}
                  selected={picked}
                  onToggle={() => selection.toggle(key)}
                />
              );
            if ("tape" in r)
              return (
                <TapeTile
                  key={key}
                  tape={r.tape}
                  index={i}
                  selecting={selection.active}
                  selected={picked}
                  onToggle={() => selection.toggle(key)}
                />
              );
            return (
              <JournalTile
                key={key}
                journal={r.journal}
                index={i}
                date={date(r.journal.updatedAt)}
                selecting={selection.active}
                selected={picked}
                onToggle={() => selection.toggle(key)}
              />
            );
          })}
        </div>
      )}

      {selection.active && (
        <BulkBar
          count={selection.count}
          total={resolved.length}
          onSelectAll={() => selection.set(resolved.map((r) => itemKey(r.item)))}
          onClear={selection.clear}
          onDone={selection.stop}
        >
          <Button
            variant="secondary"
            size="sm"
            icon="minus"
            seed="colbarm"
            disabled={selection.count === 0}
            onClick={() =>
              take.mutate(
                { id: collection.id, items: chosen },
                {
                  onSuccess: () => {
                    toast.push({
                      kind: "info",
                      title: t("collections.taken", { count: chosen.length }),
                    });
                    selection.stop();
                  },
                },
              )
            }
          >
            {t("collections.takeOut")}
          </Button>
        </BulkBar>
      )}

      <StickerDetailDialog
        sticker={preview}
        date={preview ? date(preview.createdAt) : ""}
        onClose={() => setPreviewId(null)}
        onOpenLibrary={() => navigate("/stickers")}
      />
      <Dialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        width={420}
        seed="rename-collection"
        tapes={1}
        title={t("collections.renameTitle")}
        actions={
          <>
            <Button variant="quiet" seed="colrc" onClick={() => setRenameOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              icon="check"
              seed="colrs"
              disabled={!name.trim()}
              loading={rename.isPending}
              onClick={() =>
                rename.mutate(
                  { id: collection.id, name: name.trim() },
                  { onSuccess: () => setRenameOpen(false) },
                )
              }
            >
              {t("common.save")}
            </Button>
          </>
        }
      >
        <div style={{ margin: "8px 0 6px" }}>
          <TextField
            label={t("collections.name")}
            seed="colrt"
            value={name}
            maxLength={MAX_COLLECTION_NAME}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </Dialog>
      <ConfirmDialog
        open={deleteOpen}
        title={t("collections.deleteTitle", { count: 1, name: collection.name })}
        body={t("collections.deleteBody")}
        confirmLabel={t("common.delete")}
        loading={remove.isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() =>
          remove.mutate(collection.id, {
            onSuccess: () => {
              toast.push({ kind: "info", title: t("collections.deleted", { count: 1 }) });
              navigate("/collections");
            },
          })
        }
      />
    </div>
  );
}
