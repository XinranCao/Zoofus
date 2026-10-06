import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/features/auth/useAuth";
import { usesPassword } from "./account.api";

const COLLAPSED = "zf-verify-collapsed";
const VIEWS = "zf-verify-views";
const EXPLAINED = "zf-verify-explained";
/** After this many page views the note shrinks to an icon by itself. */
const FULL_VIEWS = 3;
const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* the note comes back in full next time; fine */
  }
};
const viewCount = () => Number(read(VIEWS)) || 0;

/**
 * Asks password-based users to confirm their email. The first time it says in one sentence that
 * this is optional; after Hide, or after a few page views, it shrinks to a small icon that opens
 * it again (Resend stays one press away). It never blocks anything, and it checks again whenever the person comes back to
 * the tab (after clicking the link in the email), so there is no "I verified" button to press.
 */
export function VerifyEmailBanner() {
  const { t } = useTranslation();
  const { currentUser, sendVerification, refreshUser } = useAuth();
  const { pathname } = useLocation();
  const [sent, setSent] = useState(false);
  const [away, setAway] = useState(() => read(COLLAPSED) === "1");
  const [open, setOpen] = useState(false); // opened again from the icon
  // the "optional" sentence is for the first time the note is seen (this load; not the next)
  const [explain] = useState(() => read(EXPLAINED) !== "1");
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

  // count page views (the count is read on the next render: one view late is fine)
  useEffect(() => {
    if (pending) write(VIEWS, String(viewCount() + 1));
  }, [pending, pathname]);

  useEffect(() => {
    if (pending) write(EXPLAINED, "1");
  }, [pending]);

  const views = viewCount();
  if (!pending) return null;
  if ((away || views > FULL_VIEWS) && !open)
    return (
      <div className="zf-verify zf-verify--small">
        <button
          type="button"
          className="zf-verify__hide"
          aria-label={t("account.verify")}
          aria-expanded={false}
          onClick={() => setOpen(true)}
        >
          <Icon name="mail" />
        </button>
      </div>
    );
  return (
    <div className="zf-verify" role="status">
      <Icon name="mail" />
      <span className="zf-verify__text">
        <b>{t("account.verify")}</b>
        {explain && !open && <> {t("account.verifyWhy")}</>}
      </span>
      {sent ? (
        // not a disabled button: that would stay a Tab stop that does nothing
        <span className="zf-verify__sent" role="status">
          {t("account.sent")}
        </span>
      ) : (
        <Button
          variant="quiet"
          size="sm"
          seed="vr"
          onClick={() => void sendVerification().then(() => setSent(true))}
        >
          {t("account.resend")}
        </Button>
      )}
      <button
        type="button"
        className="zf-verify__hide"
        aria-label={t("account.hideVerify")}
        onClick={() => {
          write(COLLAPSED, "1");
          setAway(true);
          setOpen(false);
        }}
      >
        <Icon name="x" />
      </button>
    </div>
  );
}
