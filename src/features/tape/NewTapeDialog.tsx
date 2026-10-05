import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { TapeLimitError } from "./tape.api";
import type { Tape, TapeSpec } from "./tape.schema";
import { DEFAULT_DRAFT, TapeStudio, type TapeDraft } from "./TapeStudio";
import { useSaveTape, useTapes, useUpdateTape } from "./useTapes";

const draftOf = (tape: TapeSpec): TapeDraft => ({
  ...DEFAULT_DRAFT,
  pattern: tape.pattern,
  thickness: tape.thickness,
  opacity: tape.opacity,
  ends: tape.ends,
});

/**
 * Design a new tape, optionally starting from another (`from`). Mount it only while it is open, so
 * every opening starts from a fresh draft. It stays where you are: saving does not change the page.
 */
export function NewTapeDialog({
  from,
  edit,
  onClose,
}: {
  from?: TapeSpec;
  /** Change this tape instead of making a new one. */
  edit?: Tape;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: tapes } = useTapes();
  const save = useSaveTape();
  const update = useUpdateTape();
  const start = edit ?? from;
  const [draft, setDraft] = useState<TapeDraft>(start ? draftOf(start) : DEFAULT_DRAFT);
  const [name, setName] = useState(edit?.name ?? "");
  const adding = save.isPending || update.isPending;
  const defaultName =
    edit?.name ?? t("tape.defaultName", { n: (tapes?.length ?? 0) + 1 });
  const patch = (p: Partial<TapeDraft>) => setDraft((d) => ({ ...d, ...p }));

  const add = (name: string) => {
    const spec: TapeSpec = {
      name,
      pattern: draft.pattern,
      thickness: draft.thickness,
      opacity: draft.opacity,
      ends: draft.ends,
    };
    const run = edit
      ? (opts: Parameters<typeof save.mutate>[1]) =>
          update.mutate({ id: edit.id, tape: spec }, opts as never)
      : (opts: Parameters<typeof save.mutate>[1]) => save.mutate(spec, opts);
    run({
      onSuccess: () => {
        toast.push({
          kind: "success",
          title: edit ? t("tape.updated") : t("tape.added"),
        });
        onClose();
      },
      onError: (err) =>
        toast.push({
          kind: "error",
          title: t("auth.errors.toastTitle"),
          body: err instanceof TapeLimitError ? t("tape.limit") : t("tape.saveFailed"),
        }),
    });
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      width={1040}
      sheet
      seed="new-tape"
      title={edit ? t("tape.editTitle") : t("tape.newTitle")}
      actions={
        <Button
          variant="primary"
          icon={edit ? "check" : "plus"}
          seed="tsave"
          loading={adding}
          onClick={() => add(name.trim() || defaultName)}
        >
          {adding
            ? edit
              ? t("tape.saving")
              : t("tape.adding")
            : edit
              ? t("tape.saveChanges")
              : t("tape.add")}
        </Button>
      }
    >
      <div style={{ margin: "10px 0 6px" }}>
        <TapeStudio
          draft={draft}
          onDraft={patch}
          name={name}
          onName={setName}
          defaultName={defaultName}
        />
      </div>
    </Dialog>
  );
}
