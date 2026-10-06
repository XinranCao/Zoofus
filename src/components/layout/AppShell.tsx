import { useEffect, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { Masthead } from "@/components/ui/Masthead";
import { useTitleDetail } from "@/lib/pageTitle";
import { focusPageHeading } from "./useRouteFocus";
import { VerifyEmailBanner } from "@/features/account/VerifyEmailBanner";
import { useAuth } from "@/features/auth/useAuth";
import { ProfileSetupDialog } from "@/features/profile/ProfileSetupDialog";
import { useProfile } from "@/features/profile/useProfile";
import { useRealtimeSync } from "@/features/social/useRealtime";
import { useMyPublicProfile, usePending } from "@/features/social/useSocial";
import { useInviteCount } from "@/features/together/useTogether";
import { MakeHost } from "./MakeHost";
import { useRouteFocus } from "./useRouteFocus";

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
  const { t } = useTranslation();
  const { currentUser, logout } = useAuth();
  const { data: profile } = useProfile(currentUser?.uid);
  useMyPublicProfile(); // publish my nickname, picture and friend code for friends
  useRealtimeSync(); // requests, shares and invitations arrive without a refresh
  const pending = usePending();
  const invites = useInviteCount();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const detail = useTitleDetail();
  const pageTitle = `Zoofus · ${detail ?? t(titleKeyFor(pathname))}`;
  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);
  useRouteFocus(pathname, useNavigationType());
  // after logging out, whichever way (mouse, keyboard), the login page's heading has focus: the
  // menu that was used is gone, and without this focus would sit on the page body
  const wasSignedIn = useRef(false);
  useEffect(() => {
    if (currentUser) wasSignedIn.current = true;
    else if (wasSignedIn.current) {
      wasSignedIn.current = false;
      return focusPageHeading();
    }
  }, [currentUser]);

  const name =
    profile?.nickname ||
    currentUser?.displayName ||
    currentUser?.email?.split("@")[0] ||
    "";
  return (
    <div id="app">
      <a
        href="#main"
        className="zf-skip"
        onClick={(e) => {
          // a hash link does not reliably move focus under a client-side router: do it here
          e.preventDefault();
          const main = document.getElementById("main");
          main?.focus();
          main?.scrollIntoView?.();
        }}
      >
        {t("shell.skip")}
      </a>
      <Masthead
        user={
          currentUser
            ? {
                name,
                email: currentUser.email ?? undefined,
                avatar: profile?.profilePictureUrl || null,
                avatarKind: profile?.avatarKind,
                pending,
                invites,
              }
            : null
        }
        pathname={pathname}
        onLogout={() => void logout().then(() => navigate("/login"))}
      />
      <ProfileSetupDialog />
      {currentUser && <MakeHost />}
      {/* tells a screen reader which page it moved to */}
      <div className="sr-only" role="status" aria-live="polite">
        {pageTitle}
      </div>
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      {/* shown under the masthead (CSS order) but reached after the page content when tabbing */}
      <VerifyEmailBanner />
    </div>
  );
}
