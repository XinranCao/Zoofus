import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Masthead } from "@/components/ui/Masthead";
import { VerifyEmailBanner } from "@/features/account/VerifyEmailBanner";
import { useAuth } from "@/features/auth/useAuth";
import { useProfile } from "@/features/profile/useProfile";

const TITLE_KEYS: [string, string][] = [
  ["/stickers", "pageTitle.book"],
  ["/tapes", "pageTitle.tape"],
  ["/journals", "pageTitle.journals"],
  ["/collections", "pageTitle.collections"],
  ["/friends", "pageTitle.friends"],
  ["/together", "pageTitle.together"],
  ["/account", "pageTitle.account"],
  ["/login", "pageTitle.logIn"],
  ["/signup", "pageTitle.signUp"],
];

/** The page title follows the pattern `Zoofus · <page>`; there is never a tagline. */
function titleKeyFor(pathname: string): string {
  if (pathname === "/") return "pageTitle.home";
  return (
    TITLE_KEYS.find(([prefix]) => pathname.startsWith(prefix))?.[1] ??
    "pageTitle.notFound"
  );
}

/** Skip link, masthead, optional verify-email strip and the main landmark. */
export function AppShell({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const { currentUser, logout } = useAuth();
  const { data: profile } = useProfile(currentUser?.uid);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = `Zoofus · ${t(titleKeyFor(pathname))}`;
  }, [pathname, t, i18n.language]);

  const name =
    profile?.nickname ||
    currentUser?.displayName ||
    currentUser?.email?.split("@")[0] ||
    "";
  return (
    <div id="app">
      <a href="#main" className="zf-skip">
        {t("shell.skip")}
      </a>
      <Masthead
        user={
          currentUser
            ? {
                name,
                email: currentUser.email ?? undefined,
                avatar: profile?.profilePictureUrl || null,
              }
            : null
        }
        pathname={pathname}
        onLogout={() => void logout().then(() => navigate("/login"))}
      />
      <VerifyEmailBanner />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
