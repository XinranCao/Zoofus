import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/features/auth/useAuth";
import { usesPassword } from "./account.api";

const DISMISSED = "zf-verify-hidden";
const wasHidden = () => {
  try {
    return sessionStorage.getItem(DISMISSED) === "1";
  } catch {
    return false;
  }
};

/**
 * Asks password-based users to confirm their email: one plain line, small, that can be put away
 * for the session. It never blocks anything, and it checks again whenever the person comes back to
 * the tab (after clicking the link in the email), so there is no "I verified" button to press.
 */
export function VerifyEmailBanner() {
  const { t } = useTranslation();
  const { currentUser, sendVerification, refreshUser } = useAuth();
  const [sent, setSent] = useState(false);
  const [hidden, setHidden] = useState(wasHidden);
  const pending =
    !!currentUser && !currentUser.emailVerified && usesPassword(currentUser);

  useEffect(() => {
    if (!pending) return;
    const check = () => document.visibilityState === "visible" && void refreshUser();
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [pending, refreshUser]);

  if (!pending || hidden) return null;
  return (
    <div className="zf-verify" role="status">
      <Icon name="alert" />
      <span className="zf-verify__text">{t("account.verify")}</span>
      <Button
        variant="quiet"
        size="sm"
        seed="vr"
        disabled={sent}
        onClick={() => void sendVerification().then(() => setSent(true))}
      >
        {sent ? t("account.sent") : t("account.resend")}
      </Button>
      <button
        type="button"
        className="zf-verify__hide"
        aria-label={t("account.hideVerify")}
        onClick={() => {
          try {
            sessionStorage.setItem(DISMISSED, "1");
          } catch {
            /* the note comes back next time; fine */
          }
          setHidden(true);
        }}
      >
        <Icon name="x" />
      </button>
    </div>
  );
}
