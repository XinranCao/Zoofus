import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { BulkBar } from "@/components/ui/BulkBar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingNote, Skeleton } from "@/components/ui/Loader";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sticker } from "@/components/ui/Sticker";
import { TextField } from "@/components/ui/TextField";
import { ToastNote, useToast } from "@/components/ui/Toast";
import { AddToCollectionDialog } from "@/features/collections/AddToCollectionDialog";
import { ShareDialog } from "@/features/social/ShareDialog";
import { useStickers } from "@/features/stickers/library/useStickers";
import { useForgetItems } from "@/features/collections/useCollections";
import { LibraryTabs } from "@/features/library/LibraryTabs";
import { useMakeParam } from "@/lib/useMakeParam";
import { useSelection } from "@/lib/useSelection";
import { JournalTile } from "./JournalTile";
import { NewJournalDialog } from "./NewJournalDialog";
import { MAX_JOURNAL_TITLE, type Journal } from "./journal.schema";
import { useDeleteJournal, useJournals, useRenameJournal } from "./useJournals";

/** The journal collection: every journal you have made. Starting one opens the studio. */
export default function JournalsPage() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { data, isPending, isError } = useJournals();
  const remove = useDeleteJournal();
  const rename = useRenameJournal();
  const forget = useForgetItems();
  const selection = useSelection();
  const [newOpen, setNewOpen] = useState(false);
  const [renaming, setRenaming] = useState<Journal | null>(null);
  const [renameText, setRenameText] = useState("");
  const [deleting, setDeleting] = useState<Journal[] | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareOne, setShareOne] = useState<Journal | null>(null);
  const { data: stickers } = useStickers();
  useMakeParam(() => setNewOpen(true));

  const list = data ?? [];
  const date = (j: Journal) =>
    new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" }).format(
      j.updatedAt,
    );

  const confirmDelete = async () => {
    const chosen = deleting ?? [];
    const results = await Promise.allSettled(chosen.map((j) => remove.mutateAsync(j.id)));
    await forget(
      chosen
        .filter((_, i) => results[i]!.status === "fulfilled")
        .map((j) => ({ k: "journal" as const, id: j.id })),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    toast.push(
      failed
        ? {
            kind: "error",
            title: t("auth.errors.toastTitle"),
            body: t("journal.deleteFailed"),
          }
        : { kind: "info", title: t("journal.deleted", { count: chosen.length }) },
    );
    setDeleting(null);
    selection.stop();
  };

  return (
    <div className="zf-page">
      <LibraryTabs />
      <PageHeader
        title={t("journal.pageTitle")}
        lead={t("journal.lead")}
        art={["notebook", "pencil"]}
        actions={
          <>
            {list.length > 0 && (
              <Button
                variant="quiet"
                icon="select"
                seed="jsel"
                onClick={selection.active ? selection.stop : selection.start}
              >
                {selection.active ? t("bulk.done") : t("bulk.select")}
              </Button>
            )}
            <Button
              variant={list.length ? "primary" : "secondary"}
              icon="plus"
              seed="jnew"
              onClick={() => setNewOpen(true)}
            >
              {t("journal.new")}
            </Button>
          </>
        }
      />

      {isError && (
        <ToastNote
          kind="error"
          title={t("auth.errors.toastTitle")}
          body={t("journal.loadError")}
          seed="journals-error"
          role="alert"
        />
      )}
      {isPending && <LoadingNote text={t("journal.loadingList")} />}
      {isPending && (
        <div className="zf-grid-journal" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} seed={"jsk" + i} width="100%" height={280} />
          ))}
        </div>
      )}
      {!isPending && !isError && list.length === 0 && (
        <EmptyState
          seed="journals-empty"
          title={t("journal.emptyTitle")}
          art={<Sticker art="notebook" size={70} />}
          action={
            <Button
              variant="primary"
              icon="plus"
              seed="jfirst"
              onClick={() => setNewOpen(true)}
            >
              {t("journal.new")}
            </Button>
          }
        >
          {t("journal.emptyBody")}
        </EmptyState>
      )}
      {list.length > 0 && (
        <div className="zf-grid-journal">
          {list.map((j, i) => (
            <JournalTile
              key={j.id}
              journal={j}
              index={i}
              live={i < 6}
              date={date(j)}
              selecting={selection.active}
              selected={selection.ids.has(j.id)}
              onToggle={() => selection.toggle(j.id)}
              onRename={() => {
                setRenaming(j);
                setRenameText(j.title);
              }}
              onShare={() => setShareOne(j)}
              onDelete={() => setDeleting([j])}
            />
          ))}
        </div>
      )}

      {selection.active && (
        <BulkBar
          count={selection.count}
          total={list.length}
          onSelectAll={() => selection.set(list.map((j) => j.id))}
          onClear={selection.clear}
          onDone={selection.stop}
        >
          <Button
            variant="secondary"
            size="sm"
            icon="folder"
            seed="jbacol"
            disabled={selection.count === 0}
            onClick={() => setAddOpen(true)}
          >
            {t("bulk.addToCollection")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon="send"
            seed="jbashare"
            disabled={selection.count === 0}
            onClick={() => setShareOpen(true)}
          >
            {t("bulk.share")}
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon="trash"
            seed="jbadel"
            disabled={selection.count === 0}
            onClick={() => setDeleting(list.filter((j) => selection.ids.has(j.id)))}
          >
            {t("bulk.delete")}
          </Button>
        </BulkBar>
      )}

      <NewJournalDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        existing={list.length}
      />
      <ShareDialog
        open={shareOpen || shareOne !== null}
        sources={(shareOne
          ? [shareOne]
          : list.filter((j) => selection.ids.has(j.id))
        ).map((journal) => ({
          kind: "journal" as const,
          journal,
          stickers: new Map((stickers ?? []).map((s) => [s.id, s])),
        }))}
        onClose={() => {
          setShareOpen(false);
          setShareOne(null);
        }}
        onDone={selection.stop}
      />
      <AddToCollectionDialog
        open={addOpen}
        items={[...selection.ids].map((id) => ({ k: "journal" as const, id }))}
        onClose={() => setAddOpen(false)}
        onDone={selection.stop}
      />
      <ConfirmDialog
        open={deleting !== null}
        title={t("journal.deleteTitle", {
          count: deleting?.length ?? 0,
          title: deleting?.[0]?.title ?? "",
        })}
        body={t("journal.deleteBody")}
        confirmLabel={t("common.delete")}
        loading={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
      <Dialog
        open={renaming !== null}
        onOpenChange={(o) => !o && setRenaming(null)}
        width={420}
        seed="jrename"
        tapes={1}
        title={t("journal.renameTitle")}
        actions={
          <>
            <Button variant="quiet" seed="jrc" onClick={() => setRenaming(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              icon="check"
              seed="jrs"
              disabled={!renameText.trim()}
              loading={rename.isPending}
              onClick={() =>
                renaming &&
                rename.mutate(
                  { id: renaming.id, title: renameText.trim() },
                  {
                    onSuccess: () => setRenaming(null),
                    onError: () =>
                      toast.push({
                        kind: "error",
                        title: t("auth.errors.toastTitle"),
                        body: t("journal.renameFailed"),
                      }),
                  },
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
            label={t("journal.title")}
            seed="jrt"
            value={renameText}
            maxLength={MAX_JOURNAL_TITLE}
            onChange={(e) => setRenameText(e.target.value)}
          />
        </div>
      </Dialog>
    </div>
  );
}
