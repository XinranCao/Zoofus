import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAuth } from "@/features/auth/useAuth";
import {
  deleteAccount,
  exportAccountData,
  reauthenticate,
  usesPassword,
} from "./account.api";

const CONFIRM_WORD = "DELETE";

function downloadJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AccountPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!currentUser) return null;
  const needsPassword = usesPassword(currentUser);

  const onExport = async () => {
    setExporting(true);
    setExportError(false);
    try {
      downloadJson(await exportAccountData(currentUser.uid), "zoofus-data.json");
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
      navigate("/signup");
    } catch (err) {
      const code = (err as { code?: string }).code;
      setDeleteError(
        code === "auth/wrong-password" || code === "auth/invalid-credential"
          ? "That password is not correct."
          : "Could not delete the account. Nothing was changed if you were asked to sign in again.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageContainer>
      <Box sx={{ p: 3, maxWidth: 560, mx: "auto" }}>
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
          Account
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {currentUser.email}
        </Typography>

        <Stack spacing={1} sx={{ mb: 5 }}>
          <Typography variant="h6">Your data</Typography>
          <Typography variant="body2">
            Download your profile, stickers and pages as a JSON file.
          </Typography>
          <Box>
            <Button variant="outlined" disabled={exporting} onClick={onExport}>
              Download my data
            </Button>
          </Box>
          {exportError && <Alert severity="error">Could not export your data.</Alert>}
        </Stack>

        <Stack spacing={1}>
          <Typography variant="h6" color="error">
            Delete account
          </Typography>
          <Typography variant="body2">
            Permanently deletes your profile, stickers, pages and uploaded files. This
            cannot be undone.
          </Typography>
          <Box>
            <Button variant="outlined" color="error" onClick={() => setDialogOpen(true)}>
              Delete my account
            </Button>
          </Box>
        </Stack>

        <Dialog
          open={dialogOpen}
          onClose={() => !deleting && setDialogOpen(false)}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label={`Type ${CONFIRM_WORD} to confirm`}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
              />
              {needsPassword && (
                <TextField
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
              {deleteError && <Alert severity="error">{deleteError}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button disabled={deleting} onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              color="error"
              variant="contained"
              disabled={
                deleting ||
                confirmText !== CONFIRM_WORD ||
                (needsPassword && password === "")
              }
              onClick={onDelete}
            >
              Delete everything
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
}
