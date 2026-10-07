import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/features/auth/useAuth";
import { usesPassword } from "./account.api";

// kept per account (a second person on the same computer starts from the full note)
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
const viewCountOf = (uid: string) => Number(read(`${VIEWS}-${uid}`)) || 0;

/**
 * Asks password-based users to confirm their email. The first time it says in one sentence that
 * this is optional; after Hide, or after a few page views, it shrinks to a small chip ("Email not confirmed · Resend") that
 * is the Resend button itself. It never blocks anything, and it checks again whenever the person comes back to
 * the tab (after clicking the link in the email), so there is no "I verified" button to press.
 */
export function VerifyEmailBanner() {
  const { t } = useTranslation();
  const { currentUser, sendVerification, refreshUser } = useAuth();
  const { pathname } = useLocation();
  const [sent, setSent] = useState(false);
  const uid = currentUser?.uid ?? "";
  const [away, setAway] = useState(() => read(`${COLLAPSED}-${uid}`) === "1");
  // the "optional" sentence is for the first time the note is seen (this load; not the next)
  const [explain] = useState(() => read(`${EXPLAINED}-${uid}`) !== "1");
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
    if (pending) write(`${VIEWS}-${uid}`, String(viewCountOf(uid) + 1));
  }, [pending, pathname, uid]);

  useEffect(() => {
    if (pending) write(`${EXPLAINED}-${uid}`, "1");
  }, [pending, uid]);

  const views = viewCountOf(uid);
  if (!pending) return null;
  if (away || views > FULL_VIEWS)
    return (
      <div className="zf-verify zf-verify--small">
        <button
          type="button"
          className="zf-verify__chip"
          title={`${t("account.verify")} ${t("account.verifyWhy")}`}
          disabled={sent}
          onClick={() => void sendVerification().then(() => setSent(true))}
        >
          <Icon name="mail" />
          {sent ? t("account.notConfirmedSent") : t("account.notConfirmedResend")}
        </button>
      </div>
    );
  return (
    <div className="zf-verify" role="status">
      <Icon name="mail" />
      <span className="zf-verify__text">
        <b>{t("account.verify")}</b>
        {explain && <> {t("account.verifyWhy")}</>}
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
          write(`${COLLAPSED}-${uid}`, "1");
          setAway(true);
        }}
      >
        <Icon name="x" />
      </button>
    </div>
  );
}
