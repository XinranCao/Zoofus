import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { resetSchema, type ResetForm } from "../auth.schema";
import { useAuth } from "../useAuth";

export function PasswordResetDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { resetPassword } = useAuth();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });

  const onSubmit = async ({ email }: ResetForm) => {
    try {
      setError("");
      await resetPassword(email);
      setSent(true);
    } catch {
      setError("Failed to send reset email");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          {sent ? (
            <Typography>Check your email for reset instructions.</Typography>
          ) : (
            <>
              <TextField
                label="Email"
                type="email"
                fullWidth
                margin="dense"
                error={Boolean(errors.email)}
                helperText={errors.email?.message}
                {...register("email")}
              />
              {error && <Typography color="error">{error}</Typography>}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
          {!sent && (
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              Send
            </Button>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
}
