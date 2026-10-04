import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { TapeLimitError } from "./tape.api";
import type { TapeSpec } from "./tape.schema";
import { DEFAULT_DRAFT, TapeStudio, type TapeDraft } from "./TapeStudio";
import { useSaveTape, useTapes } from "./useTapes";

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
  onClose,
}: {
  from?: TapeSpec;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: tapes } = useTapes();
  const save = useSaveTape();
  const [draft, setDraft] = useState<TapeDraft>(from ? draftOf(from) : DEFAULT_DRAFT);
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
          onClose();
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
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      width={1040}
      sheet
      seed="new-tape"
      title={t("tape.newTitle")}
    >
      <div style={{ margin: "10px 0 6px" }}>
        <TapeStudio
          draft={draft}
          onDraft={patch}
          defaultName={t("tape.defaultName", { n: (tapes?.length ?? 0) + 1 })}
          onAdd={add}
          adding={save.isPending}
        />
      </div>
    </Dialog>
  );
}
