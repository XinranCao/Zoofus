import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Paper } from "@/components/ui/Paper";
import { useAuth } from "@/features/auth/useAuth";
import { usesPassword } from "./account.api";

/** Asks password-based users to verify their email. A flat note; it never blocks use of the app. */
export function VerifyEmailBanner() {
  const { t } = useTranslation();
  const { currentUser, sendVerification, refreshUser } = useAuth();
  const [sent, setSent] = useState(false);

  if (!currentUser || currentUser.emailVerified || !usesPassword(currentUser))
    return null;

  return (
    <div className="zf-page" style={{ paddingTop: 12, paddingBottom: 0 }}>
      <Paper
        seed="verify"
        size="sm"
        tone="scrap-warm"
        rotate={0.4}
        role="status"
        faceStyle={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          padding: "10px 16px",
        }}
      >
        <Icon name="alert" />
        <span style={{ flex: "1 1 240px" }}>
          {t("account.verify", { email: currentUser.email })}
        </span>
        <Button
          variant="quiet"
          size="sm"
          seed="vr"
          disabled={sent}
          onClick={() => void sendVerification().then(() => setSent(true))}
        >
          {sent ? t("account.sent") : t("account.resend")}
        </Button>
        <Button variant="quiet" size="sm" seed="vv" onClick={() => void refreshUser()}>
          {t("account.verified")}
        </Button>
      </Paper>
    </div>
  );
}
