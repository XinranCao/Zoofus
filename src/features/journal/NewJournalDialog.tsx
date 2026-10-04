import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { DEFAULT_PAGE, MAX_JOURNAL_TITLE, type PageSpec } from "./journal.schema";
import { JournalLimitError } from "./journal.api";
import { PagePreviewPane } from "./PagePreviewPane";
import { PageSetup } from "./PageSetup";
import { useCreateJournal } from "./useJournals";

/** Start a journal: name it and choose its paper, then go straight into the studio. */
export function NewJournalDialog({
  open,
  onClose,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  existing: number;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const create = useCreateJournal();
  const [title, setTitle] = useState("");
  const [page, setPage] = useState<PageSpec>(DEFAULT_PAGE);

  const go = () =>
    create.mutate(
      {
        title: title.trim() || t("journal.defaultTitle", { n: existing + 1 }),
        page,
        existing,
      },
      {
        onSuccess: (id) => {
          onClose();
          setTitle("");
          navigate(`/journals/${id}`);
        },
        onError: (err) =>
          toast.push({
            kind: "error",
            title: t("auth.errors.toastTitle"),
            body:
              err instanceof JournalLimitError
                ? t("journal.limit")
                : t("journal.createFailed"),
          }),
      },
    );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      width={820}
      sheet
      seed="new-journal"
      title={t("journal.newTitle")}
      actions={
        <>
          <Button variant="quiet" seed="njc" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            icon="check"
            seed="njg"
            loading={create.isPending}
            onClick={go}
          >
            {t("journal.start")}
          </Button>
        </>
      }
    >
      <div className="zf-newjournal">
        <div style={{ display: "grid", gap: 22, minWidth: 0 }}>
          <TextField
            label={t("journal.title")}
            seed="njt"
            value={title}
            maxLength={MAX_JOURNAL_TITLE}
            placeholder={t("journal.defaultTitle", { n: existing + 1 })}
            onChange={(e) => setTitle(e.target.value)}
          />
          <PageSetup value={page} onChange={setPage} />
        </div>
        <PagePreviewPane page={page} />
      </div>
    </Dialog>
  );
}
