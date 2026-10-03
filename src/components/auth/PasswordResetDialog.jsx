import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

const PasswordResetDialog = ({ open, onClose }) => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const { resetPassword } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleReset = async () => {
    try {
      setError("");
      await resetPassword(email);
      setSent(true);
    } catch {
      setError("Failed to send reset email");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={isMobile ? "xs" : "sm"}
      PaperProps={{
        sx: {
          width: isMobile ? "100%" : 400,
          m: isMobile ? 0 : 2,
        },
      }}
    >
      <DialogTitle>Reset Password</DialogTitle>
      <DialogContent>
        {sent ? (
          <Typography>Check your email for reset instructions.</Typography>
        ) : (
          <>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              margin="dense"
            />
            {error && <Typography color="error">{error}</Typography>}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {!sent && (
          <Button onClick={handleReset} variant="contained">
            Send
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PasswordResetDialog;
