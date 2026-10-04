import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { BulkBar } from "@/components/ui/BulkBar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SelectMark } from "@/components/ui/SelectMark";
import { Skeleton } from "@/components/ui/Loader";
import { Sticker as Art } from "@/components/ui/Sticker";
import { TextField } from "@/components/ui/TextField";
import { ToastNote, useToast } from "@/components/ui/Toast";
import { useJournals } from "@/features/journal/useJournals";
import { LibraryTabs } from "@/features/library/LibraryTabs";
import { useStickers } from "@/features/stickers/library/useStickers";
import { ensureFontsFor } from "@/lib/cjkFonts";
import { cn } from "@/lib/cn";
import { useMakeParam } from "@/lib/useMakeParam";
import { useSelection } from "@/lib/useSelection";
import { MAX_COLLECTION_NAME, type Collection } from "./collection.schema";
import { FolderThumb } from "./FolderThumb";
import { CollectionLimitError } from "./collections.api";
import {
  useCollections,
  useCreateCollection,
  useDeleteCollection,
} from "./useCollections";

/** Your own collections: groups you make up, of stickers, tapes and journals. */
export default function CollectionsPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data, isPending, isError } = useCollections();
  const create = useCreateCollection();
  const remove = useDeleteCollection();
  const selection = useSelection();
  const [newOpen, setNewOpen] = useState(false);
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState<Collection[] | null>(null);
  useMakeParam(() => setNewOpen(true));
  const list = data ?? [];

  const make = () => {
    const n = name.trim();
    if (!n) return;
    create.mutate(
      { name: n, existing: list.length },
      {
        onSuccess: () => {
          setNewOpen(false);
          setName("");
          toast.push({ kind: "success", title: t("collections.created") });
        },
        onError: (err) =>
          toast.push({
            kind: "error",
            title: t("auth.errors.toastTitle"),
            body:
              err instanceof CollectionLimitError
                ? t("collections.limit")
                : t("collections.failed"),
          }),
      },
    );
  };

  return (
    <div className="zf-page">
      <LibraryTabs />
      <PageHeader
        title={t("collections.title")}
        lead={t("collections.lead")}
        art={["folder", "heart"]}
        actions={
          <>
            {list.length > 0 && (
              <Button
                variant="quiet"
                icon="select"
                seed="csel"
                onClick={selection.active ? selection.stop : selection.start}
              >
                {selection.active ? t("bulk.done") : t("bulk.select")}
              </Button>
            )}
            <Button
              variant={list.length ? "primary" : "secondary"}
              icon="plus"
              seed="cnew"
              onClick={() => setNewOpen(true)}
            >
              {t("collections.new")}
            </Button>
          </>
        }
      />
      {isError && (
        <ToastNote
          kind="error"
          title={t("auth.errors.toastTitle")}
          body={t("collections.loadError")}
          seed="cols-error"
          role="alert"
        />
      )}
      {isPending && (
        <div className="zf-grid-journal" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} seed={"csk" + i} width="100%" height={170} />
          ))}
        </div>
      )}
      {!isPending && !isError && list.length === 0 && (
        <EmptyState
          seed="cols-empty"
          title={t("collections.emptyTitle")}
          art={<Art art="folder" size={70} />}
          action={
            <Button
              variant="primary"
              icon="plus"
              seed="cfirst"
              onClick={() => setNewOpen(true)}
            >
              {t("collections.new")}
            </Button>
          }
        >
          {t("collections.emptyBody")}
        </EmptyState>
      )}
      {list.length > 0 && (
        <div className="zf-grid-journal">
          {list.map((c) => (
            <CollectionTile
              key={c.id}
              collection={c}
              selecting={selection.active}
              selected={selection.ids.has(c.id)}
              onToggle={() => selection.toggle(c.id)}
            />
          ))}
        </div>
      )}

      {selection.active && (
        <BulkBar
          count={selection.count}
          total={list.length}
          onSelectAll={() => selection.set(list.map((c) => c.id))}
          onClear={selection.clear}
          onDone={selection.stop}
        >
          <Button
            variant="danger"
            size="sm"
            icon="trash"
            seed="cbadel"
            disabled={selection.count === 0}
            onClick={() => setDeleting(list.filter((c) => selection.ids.has(c.id)))}
          >
            {t("bulk.delete")}
          </Button>
        </BulkBar>
      )}

      <Dialog
        open={newOpen}
        onOpenChange={setNewOpen}
        width={420}
        seed="new-collection"
        tapes={1}
        title={t("collections.newTitle")}
        actions={
          <>
            <Button variant="quiet" seed="cnc" onClick={() => setNewOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              icon="check"
              seed="cng"
              disabled={!name.trim()}
              loading={create.isPending}
              onClick={make}
            >
              {t("collections.create")}
            </Button>
          </>
        }
      >
        <form
          style={{ margin: "8px 0 6px" }}
          onSubmit={(e) => {
            e.preventDefault();
            make();
          }}
        >
          <TextField
            label={t("collections.name")}
            seed="cnn"
            value={name}
            maxLength={MAX_COLLECTION_NAME}
            placeholder={t("collections.namePlaceholder")}
            onChange={(e) => setName(e.target.value)}
          />
        </form>
      </Dialog>
      <ConfirmDialog
        open={deleting !== null}
        title={t("collections.deleteTitle", {
          count: deleting?.length ?? 0,
          name: deleting?.[0]?.name ?? "",
        })}
        body={t("collections.deleteBody")}
        confirmLabel={t("common.delete")}
        loading={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const chosen = deleting ?? [];
          void Promise.allSettled(chosen.map((c) => remove.mutateAsync(c.id))).then(
            () => {
              toast.push({
                kind: "info",
                title: t("collections.deleted", { count: chosen.length }),
              });
              setDeleting(null);
              selection.stop();
            },
          );
        }}
      />
    </div>
  );
}

function CollectionTile({
  collection,
  selecting,
  selected,
  onToggle,
}: {
  collection: Collection;
  selecting: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const { data: stickers } = useStickers();
  const { data: journals } = useJournals();
  ensureFontsFor(collection.name);
  const pictures = collection.items
    .flatMap((i) => {
      if (i.k === "sticker") return stickers?.find((s) => s.id === i.id)?.imageUrl ?? [];
      if (i.k === "journal") return journals?.find((j) => j.id === i.id)?.thumbUrl ?? [];
      return [];
    })
    .slice(0, 5);
  const inner = (
    <>
      {selecting && <SelectMark selected={selected} />}
      <FolderThumb id={collection.id} pictures={pictures} />
      <span className="zf-tile__name" style={{ marginTop: 10 }}>
        {collection.name}
      </span>
      <span className="zf-tile__meta">
        {t("collections.count", { count: collection.items.length })}
      </span>
    </>
  );
  return (
    <figure
      className={cn("zf-tile", selecting && "is-selecting", selected && "is-selected")}
    >
      {selecting ? (
        <button
          type="button"
          className="zf-tile__open"
          aria-pressed={selected}
          aria-label={collection.name}
          onClick={onToggle}
        >
          {inner}
        </button>
      ) : (
        <Link
          to={`/collections/${collection.id}`}
          className="zf-tile__open"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          {inner}
        </Link>
      )}
    </figure>
  );
}
