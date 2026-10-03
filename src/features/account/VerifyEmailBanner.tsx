import { Alert, Button } from "@mui/material";
import { useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { usesPassword } from "./account.api";

/** Prompts password-based users to verify their email. It never blocks use of the app. */
export function VerifyEmailBanner() {
  const { currentUser, sendVerification, refreshUser } = useAuth();
  const [sent, setSent] = useState(false);

  if (!currentUser || currentUser.emailVerified || !usesPassword(currentUser))
    return null;

  return (
    <Alert
      severity="info"
      action={
        <>
          <Button
            color="inherit"
            size="small"
            disabled={sent}
            onClick={() => sendVerification().then(() => setSent(true))}
          >
            {sent ? "Sent" : "Resend email"}
          </Button>
          <Button color="inherit" size="small" onClick={() => refreshUser()}>
            I verified
          </Button>
        </>
      }
    >
      Please verify your email address ({currentUser.email}).
    </Alert>
  );
}
