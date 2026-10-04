import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./Button";
import { Dialog, DialogBody } from "./Dialog";

/** "Are you sure?" for something that cannot be undone. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  danger = true,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && !loading && onCancel()}
      width={420}
      seed="confirm"
      tapes={1}
      title={title}
      actions={
        <>
          <Button variant="quiet" seed="cf-no" disabled={loading} onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            icon={danger ? "trash" : "check"}
            seed="cf-yes"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {body && <DialogBody>{body}</DialogBody>}
    </Dialog>
  );
}
