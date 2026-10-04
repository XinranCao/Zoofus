import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
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
import { TapeLimitError } from "./tape.api";
import { STARTER_TAPES, type TapeSpec } from "./tape.schema";
import { DEFAULT_DRAFT, TapeStudio, type TapeDraft } from "./TapeStudio";
import { TapeTile } from "./TapeTile";
import { useDeleteTape, useSaveTape, useTapes } from "./useTapes";

const draftOf = (tape: TapeSpec): TapeDraft => ({
  ...DEFAULT_DRAFT,
  pattern: tape.pattern,
  thickness: tape.thickness,
  opacity: tape.opacity,
  ends: tape.ends,
});

/** The tape collection: your tapes and the starters. A new tape is made in a dialog. */
export default function TapePage() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: tapes, isError } = useTapes();
  const save = useSaveTape();
  const remove = useDeleteTape();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TapeDraft>(DEFAULT_DRAFT);
  const selection = useSelection();
  const forget = useForgetItems();
  const [addOpen, setAddOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const start = (from?: TapeSpec) => {
    setDraft(from ? draftOf(from) : DEFAULT_DRAFT);
    setOpen(true);
  };
  useMakeParam(() => start());

  const mine = tapes ?? [];
  const patch = (p: Partial<TapeDraft>) => setDraft((d) => ({ ...d, ...p }));

  const add = (name: string) =>
    save.mutate(
      {
        name,
        pattern: draft.pattern,
        thickness: draft.thickness,
        opacity: draft.opacity,
        ends: draft.ends,
      },
      {
        onSuccess: () => {
          toast.push({ kind: "success", title: t("tape.added") });
          setOpen(false);
        },
        onError: (err) =>
          toast.push({
            kind: "error",
            title: t("auth.errors.toastTitle"),
            body: err instanceof TapeLimitError ? t("tape.limit") : t("tape.saveFailed"),
          }),
      },
    );

  return (
    <div className="zf-page">
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
            <Button variant="primary" icon="plus" seed="newtape" onClick={() => start()}>
              {t("tape.new")}
            </Button>
          </>
        }
      />
      <LibraryTabs />
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
      {mine.length === 0 ? (
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
        {STARTER_TAPES.map((tape, i) => (
          <TapeTile
            key={tape.name}
            tape={tape}
            index={i}
            starter
            onUse={() => start(tape)}
          />
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
        open={shareOpen}
        sources={mine
          .filter((x) => selection.ids.has(x.id))
          .map((tape) => ({ kind: "tape" as const, tape }))}
        onClose={() => setShareOpen(false)}
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
        open={open}
        onOpenChange={setOpen}
        width={1040}
        sheet
        seed="new-tape"
        title={t("tape.newTitle")}
      >
        <div style={{ margin: "10px 0 6px" }}>
          <TapeStudio
            draft={draft}
            onDraft={patch}
            defaultName={t("tape.defaultName", { n: mine.length + 1 })}
            onAdd={add}
            adding={save.isPending}
          />
        </div>
      </Dialog>
    </div>
  );
}
