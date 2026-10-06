import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ToastNote, useToast } from "@/components/ui/Toast";
import { LibraryTabs } from "@/features/library/LibraryTabs";
import { useMakeParam } from "@/lib/useMakeParam";
import { useSelection } from "@/lib/useSelection";
import { BulkBar } from "@/components/ui/BulkBar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AddToCollectionDialog } from "@/features/collections/AddToCollectionDialog";
import { ShareDialog } from "@/features/social/ShareDialog";
import { useForgetItems } from "@/features/collections/useCollections";
import { useStarterTapes } from "./starters";
import { MAX_TAPE_NAME, type Tape, type TapeSpec } from "./tape.schema";
import { NewTapeDialog } from "./NewTapeDialog";
import { LoadingNote, Skeleton } from "@/components/ui/Loader";
import { TapeTile } from "./TapeTile";
import { useDeleteTape, useRenameTape, useTapes } from "./useTapes";

/** The tape collection: your tapes and the starters. A new tape is made in a dialog. */
export default function TapePage() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: tapes, isError, isPending } = useTapes();
  const starters = useStarterTapes();
  const remove = useDeleteTape();
  const rename = useRenameTape();
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  /** The dialog is open when this is set; `from` is the tape it starts from, if any. */
  const [making, setMaking] = useState<{ from?: TapeSpec; edit?: Tape } | null>(null);
  const selection = useSelection();
  const forget = useForgetItems();
  const [addOpen, setAddOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareOne, setShareOne] = useState<(TapeSpec & { id: string }) | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const start = (from?: TapeSpec) => setMaking({ from });
  const editOne = (edit: Tape) => setMaking({ edit });
  useMakeParam(() => start());

  const mine = tapes ?? [];
  return (
    <div className="zf-page">
      <LibraryTabs />
      <PageHeader
        title={t("tape.title")}
        lead={t("tape.lead")}
        art={["roll", "scissors"]}
        actions={
          <>
            {mine.length > 0 && (
              <Button
                variant="quiet"
                icon="select"
                seed="tsel"
                onClick={selection.active ? selection.stop : selection.start}
              >
                {selection.active ? t("bulk.done") : t("bulk.select")}
              </Button>
            )}
            <Button
              variant={mine.length ? "primary" : "secondary"}
              icon="plus"
              seed="newtape"
              onClick={() => start()}
            >
              {t("tape.new")}
            </Button>
          </>
        }
      />
      {isError && (
        <div style={{ marginBottom: 20 }}>
          <ToastNote
            kind="error"
            title={t("auth.errors.toastTitle")}
            body={t("tape.loadError")}
            seed="tape-error"
            role="alert"
          />
        </div>
      )}

      <h2 className="zf-h1" style={{ margin: "0 0 14px" }}>
        {t("tape.mine", { count: mine.length })}
      </h2>
      {isPending && !isError ? (
        <>
          <LoadingNote text={t("tape.loadingList")} />
          <div className="zf-grid-book" aria-busy="true">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} seed={"tsk" + i} width="100%" height={150} />
            ))}
          </div>
        </>
      ) : mine.length === 0 ? (
        <EmptyState
          seed="tapes-empty"
          title={t("tape.emptyTitle")}
          art={null}
          action={
            <Button
              variant="primary"
              icon="plus"
              seed="tapes-first"
              onClick={() => start()}
            >
              {t("tape.new")}
            </Button>
          }
        >
          {t("tape.emptyBody")}
        </EmptyState>
      ) : (
        <div className="zf-grid-tape">
          {mine.map((tape, i) => (
            <TapeTile
              key={tape.id}
              tape={tape}
              index={i}
              onUse={() => start(tape)}
              onShare={() => setShareOne(tape)}
              onEdit={() => editOne(tape)}
              onRename={() => setRenaming({ id: tape.id, name: tape.name })}
              onDelete={() =>
                remove.mutate(tape.id, {
                  onSuccess: () => {
                    void forget([{ k: "tape", id: tape.id }]);
                    toast.push({ kind: "info", title: t("tape.removed") });
                  },
                })
              }
              selecting={selection.active}
              selected={selection.ids.has(tape.id)}
              onToggle={() => selection.toggle(tape.id)}
            />
          ))}
        </div>
      )}

      <h2 className="zf-h1" style={{ margin: "40px 0 14px" }}>
        {t("tape.starters")}
      </h2>
      <div className="zf-grid-tape">
        {starters.map((tape, i) => (
          <TapeTile key={i} tape={tape} index={i} starter onUse={() => start(tape)} />
        ))}
      </div>

      {selection.active && (
        <BulkBar
          count={selection.count}
          total={mine.length}
          onSelectAll={() => selection.set(mine.map((x) => x.id))}
          onClear={selection.clear}
          onDone={selection.stop}
        >
          <Button
            variant="secondary"
            size="sm"
            icon="folder"
            seed="tbacol"
            disabled={selection.count === 0}
            onClick={() => setAddOpen(true)}
          >
            {t("bulk.addToCollection")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon="send"
            seed="tbashare"
            disabled={selection.count === 0}
            onClick={() => setShareOpen(true)}
          >
            {t("bulk.share")}
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon="trash"
            seed="tbadel"
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
          ? mine.filter((x) => x.id === shareOne.id)
          : mine.filter((x) => selection.ids.has(x.id))
        ).map((tape) => ({ kind: "tape" as const, tape }))}
        onClose={() => {
          setShareOpen(false);
          setShareOne(null);
        }}
        onDone={selection.stop}
      />
      <AddToCollectionDialog
        open={addOpen}
        items={[...selection.ids].map((id) => ({ k: "tape" as const, id }))}
        onClose={() => setAddOpen(false)}
        onDone={selection.stop}
      />
      <ConfirmDialog
        open={bulkDelete}
        title={t("tape.bulkDeleteTitle", { count: selection.count })}
        confirmLabel={t("common.delete")}
        loading={bulkBusy}
        onCancel={() => setBulkDelete(false)}
        onConfirm={() => {
          const ids = [...selection.ids];
          setBulkBusy(true);
          void Promise.allSettled(ids.map((id) => remove.mutateAsync(id)))
            .then(async (results) => {
              await forget(
                ids
                  .filter((_, i) => results[i]!.status === "fulfilled")
                  .map((id) => ({ k: "tape" as const, id })),
              );
              toast.push({ kind: "info", title: t("tape.removed") });
            })
            .finally(() => {
              setBulkBusy(false);
              setBulkDelete(false);
              selection.stop();
            });
        }}
      />
      <Dialog
        open={renaming !== null}
        onOpenChange={(o) => !o && setRenaming(null)}
        width={420}
        seed="trename"
        tapes={1}
        title={t("tape.renameTitle")}
        actions={
          <>
            <Button variant="quiet" seed="trc" onClick={() => setRenaming(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              icon="check"
              seed="trs"
              disabled={!renaming?.name.trim()}
              loading={rename.isPending}
              onClick={() =>
                renaming &&
                rename.mutate(
                  { id: renaming.id, name: renaming.name.trim() },
                  {
                    onSuccess: () => setRenaming(null),
                    onError: () =>
                      toast.push({
                        kind: "error",
                        title: t("auth.errors.toastTitle"),
                        body: t("tape.renameFailed"),
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
            label={t("tape.nameLabel")}
            seed="trt"
            value={renaming?.name ?? ""}
            maxLength={MAX_TAPE_NAME}
            onChange={(e) => setRenaming((r) => r && { ...r, name: e.target.value })}
          />
        </div>
      </Dialog>
      {making && (
        <NewTapeDialog
          from={making.from}
          edit={making.edit}
          onClose={() => setMaking(null)}
        />
      )}
    </div>
  );
}
