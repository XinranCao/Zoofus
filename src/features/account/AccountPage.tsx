import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Paper } from "@/components/ui/Paper";
import { Tape } from "@/components/ui/Tape";
import { TextField } from "@/components/ui/TextField";
import { ToastNote } from "@/components/ui/Toast";
import { useAuth } from "@/features/auth/useAuth";
import { downloadBlob } from "@/features/stickers/studio/export";
import {
  deleteAccount,
  exportAccountData,
  reauthenticate,
  usesPassword,
} from "./account.api";

export default function AccountPage() {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!currentUser) return null;
  const needsPassword = usesPassword(currentUser);
  const word = t("account.confirmWord");

  const onExport = async () => {
    setExporting(true);
    setExportError(false);
    try {
      const data = await exportAccountData(currentUser.uid);
      downloadBlob(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
        "zoofus-data.json",
      );
    } catch {
      setExportError(true);
    } finally {
      setExporting(false);
    }
  };

  const onDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await reauthenticate(currentUser, password);
      await deleteAccount(currentUser);
      queryClient.clear();
      navigate("/signup");
    } catch (err) {
      console.error("Account deletion failed", err);
      const code = (err as { code?: string }).code;
      setDeleteError(
        code === "auth/wrong-password" || code === "auth/invalid-credential"
          ? t("account.wrongPassword")
          : t("account.deleteFailed"),
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="zf-page" style={{ maxWidth: 760 }}>
      <div className="zf-kicker">{t("account.kicker")}</div>
      <h1 className="zf-display" style={{ margin: "4px 0 6px" }}>
        {t("account.title")}
      </h1>
      <p className="zf-muted" style={{ margin: "0 0 32px" }}>
        {currentUser.email}
      </p>

      <div style={{ display: "grid", gap: 36 }}>
        <Paper
          seed="acct-data"
          size="lg"
          tone="scrap-cool"
          rotate={0.6}
          tape={<Tape seed="ad" x="14%" y="4px" color="tape-celery" />}
          faceStyle={{ padding: "28px 26px" }}
        >
          <h2 className="zf-h2">{t("account.dataTitle")}</h2>
          <p style={{ margin: "8px 0 16px" }}>{t("account.dataBody")}</p>
          <Button
            variant="secondary"
            icon="download"
            seed="exp"
            loading={exporting}
            onClick={() => void onExport()}
          >
            {exporting ? t("account.downloading") : t("account.download")}
          </Button>
          {exportError && (
            <div style={{ marginTop: 14 }}>
              <ToastNote
                kind="error"
                title={t("auth.errors.toastTitle")}
                body={t("account.exportFailed")}
                seed="exp-error"
                role="alert"
              />
            </div>
          )}
        </Paper>

        <Paper
          seed="acct-delete"
          size="lg"
          tone="scrap-pink"
          rotate={-0.6}
          faceStyle={{ padding: "28px 26px" }}
        >
          <h2 className="zf-h2" style={{ color: "var(--danger)" }}>
            {t("account.deleteTitle")}
          </h2>
          <p style={{ margin: "8px 0 16px" }}>{t("account.deleteBody")}</p>
          <Button variant="danger" icon="trash" seed="del" onClick={() => setOpen(true)}>
            {t("account.deleteButton")}
          </Button>
        </Paper>
      </div>

      <Dialog
        open={open}
        onOpenChange={(o) => !deleting && setOpen(o)}
        width={420}
        seed="acct-dialog"
        tapes={1}
        title={t("account.dialogTitle")}
        actions={
          <>
            <Button
              variant="quiet"
              seed="adc"
              disabled={deleting}
              onClick={() => setOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              seed="add"
              loading={deleting}
              disabled={confirmText !== word || (needsPassword && password === "")}
              onClick={() => void onDelete()}
            >
              {deleting ? t("account.deleting") : t("account.deleteEverything")}
            </Button>
          </>
        }
      >
        <div style={{ display: "grid", gap: 16, margin: "8px 0 22px" }}>
          <TextField
            label={t("account.confirmLabel", { word })}
            seed="acf"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
          />
          {needsPassword && (
            <TextField
              label={t("account.password")}
              type="password"
              autoComplete="current-password"
              seed="acp"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          {deleteError && (
            <ToastNote
              kind="error"
              title={t("auth.errors.toastTitle")}
              body={deleteError}
              seed="acd-error"
              role="alert"
            />
          )}
        </div>
      </Dialog>
    </div>
  );
}
