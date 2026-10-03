import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ToastNote, useToast } from "@/components/ui/Toast";
import { BookTabs } from "@/features/stickers/library/StickerBookPage";
import { TapeLimitError } from "./tape.api";
import { STARTER_TAPES, type TapeSpec } from "./tape.schema";
import { DEFAULT_DRAFT, TapeStudio, type TapeDraft } from "./TapeStudio";
import { useDeleteTape, useSaveTape, useTapes } from "./useTapes";

/** The Tape tab of the sticker book: design a tape, keep it in "My tape roll". */
export default function TapePage() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: tapes, isError } = useTapes();
  const save = useSaveTape();
  const remove = useDeleteTape();
  const [draft, setDraft] = useState<TapeDraft>(DEFAULT_DRAFT);

  const roll = [...(tapes ?? []), ...STARTER_TAPES];
  const patch = (p: Partial<TapeDraft>) => setDraft((d) => ({ ...d, ...p }));
  const use = (tape: TapeSpec) =>
    patch({
      pattern: tape.pattern,
      thickness: tape.thickness,
      opacity: tape.opacity,
      ends: tape.ends,
    });

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
        onSuccess: () => toast.push({ kind: "success", title: t("tape.added") }),
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
      <BookTabs />
      <div className="zf-kicker">{t("tape.kicker")}</div>
      <h1 className="zf-display" style={{ margin: "4px 0 28px" }}>
        {t("tape.title")}
      </h1>
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
      <TapeStudio
        draft={draft}
        onDraft={patch}
        roll={roll}
        onUse={use}
        onRemove={(id) =>
          remove.mutate(id, {
            onSuccess: () => toast.push({ kind: "info", title: t("tape.removed") }),
          })
        }
        onAdd={add}
        adding={save.isPending}
      />
    </div>
  );
}
