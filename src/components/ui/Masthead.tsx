import * as RMenu from "@radix-ui/react-dropdown-menu";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LANGUAGES } from "@/i18n";
import { ensureFontsFor } from "@/lib/cjkFonts";
import { useMake, type MakeKey } from "@/lib/makeStore";
import { tornClip } from "@/paper/torn";
import { Avatar } from "./Avatar";
import { Button, ButtonLink } from "./Button";
import { Icon, type IconName } from "./Icon";
import { Paper } from "./Paper";
import { Circled, Divider, Scribble } from "./Scribble";
import { Wordmark } from "./Wordmark";

export interface MastheadUser {
  name: string;
  email?: string;
  avatar?: string | null;
  /** `sticker`: the picture is a die-cut sticker and is shown with its own shape. */
  avatarKind?: "sticker" | "photo";
  /** Friend requests and shares waiting, shown as a small count on Friends. */
  pending?: number;
  /** Invitations to a shared journal waiting, shown as a red dot on Together. */
  invites?: number;
}

interface MenuItem {
  to?: string;
  icon: IconName;
  label: string;
  onSelect?: () => void;
  current?: boolean;
  /** A red dot: something here is waiting for you. */
  dot?: string;
  /** A count of what is waiting here (requests and shares), as a small number. */
  count?: number;
}

/** What "Make" offers: one place for everything that can be made. */
export const MAKE_ITEMS: { key: MakeKey; icon: IconName }[] = [
  { key: "sticker", icon: "lasso" },
  { key: "tape", icon: "tape" },
  { key: "journal", icon: "journal" },
  { key: "together", icon: "users" },
];

/**
 * A non-modal menu (the page behind stays in the accessibility tree) that still behaves like a
 * menu: Esc and an outside click close it and focus returns to the trigger (Radix does both), Tab
 * closes it and moves on (Radix would trap it), and on a phone the page behind does not scroll.
 */
function Menu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      document
        .querySelector<HTMLElement>('[aria-haspopup="menu"][aria-expanded="true"]')
        ?.focus(); // so the default Tab continues from the trigger, past the menu
      setOpen(false);
      e.stopPropagation(); // keep Radix from cancelling the Tab
    };
    document.addEventListener("keydown", onTab, true);
    const phone = window.matchMedia?.("(max-width: 759.98px)").matches;
    const before = document.body.style.overflow;
    if (phone) document.body.style.overflow = "hidden"; // scroll lock; not aria-hidden
    return () => {
      document.removeEventListener("keydown", onTab, true);
      document.body.style.overflow = before;
    };
  }, [open]);
  return (
    <RMenu.Root modal={false} open={open} onOpenChange={setOpen}>
      {children}
    </RMenu.Root>
  );
}

function ItemRow({ it }: { it: MenuItem }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <RMenu.Item
      asChild
      onSelect={() => {
        if (it.to) navigate(it.to);
        it.onSelect?.();
      }}
    >
      {it.to ? (
        <Link
          to={it.to}
          className={"zf-menu__item" + (it.current ? " is-active" : "")}
          aria-current={it.current ? "page" : undefined}
        >
          <Icon name={it.icon} />
          {it.label}
          {it.dot && <span className="zf-alertdot" role="img" aria-label={it.dot} />}
          {it.count ? (
            <span className="zf-badge" aria-label={t("nav.pending", { count: it.count })}>
              {it.count}
            </span>
          ) : null}
        </Link>
      ) : (
        <button type="button" className="zf-menu__item">
          <Icon name={it.icon} />
          {it.label}
        </button>
      )}
    </RMenu.Item>
  );
}

/** A flat scrap Paper menu (Radix DropdownMenu: arrow keys, typeahead), items in groups. */
function MenuContent({
  user,
  groups,
  seed,
  align = "end",
  language,
}: {
  user?: MastheadUser;
  groups: MenuItem[][];
  seed: string;
  align?: "start" | "end";
  /** Adds the language choice (English / 中文) under the items. */
  language?: boolean;
}) {
  const style = {
    "--clip-item": tornClip(seed + "i", { size: "xs", w: 200, h: 36 }),
  } as CSSProperties;
  return (
    <RMenu.Portal>
      <RMenu.Content asChild align={align} sideOffset={10} collisionPadding={12}>
        <Paper
          seed={seed}
          size="md"
          tone="scrap"
          rotate={0.5}
          className="zf-menu z-50"
          style={{ minWidth: 230, ...style }}
        >
          {user && (
            <>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  padding: "6px 8px",
                }}
              >
                <Avatar
                  name={user.name}
                  src={user.avatar}
                  kind={user.avatarKind}
                  size={34}
                  seed={user.name + "-card"}
                  asStatic
                />
                <div style={{ minWidth: 0 }}>
                  <div className="zf-h2" style={{ fontSize: 16 }}>
                    {user.name}
                  </div>
                  {user.email && (
                    <div
                      className="zf-muted"
                      style={{ fontSize: 12, overflowWrap: "anywhere" }}
                    >
                      {user.email}
                    </div>
                  )}
                </div>
              </div>
              <Divider seed={seed} />
            </>
          )}
          {groups.map((items, g) => (
            <div key={g}>
              {g > 0 && <Divider seed={seed + "g" + g} />}
              {items.map((it) => (
                <ItemRow key={it.label} it={it} />
              ))}
            </div>
          ))}
          {language && <LanguageGroup seed={seed} />}
        </Paper>
      </RMenu.Content>
    </RMenu.Portal>
  );
}

/** A long name is cut in the text itself (not by CSS), so no hidden part of it sticks out of the bar. */
const shortName = (name: string, max = 14) =>
  [...name].length > max ? [...name].slice(0, max - 1).join("") + "…" : name;

/** The language choice inside the account menu: a labelled pair, the current one marked. */
function LanguageGroup({ seed }: { seed: string }) {
  const { t, i18n } = useTranslation();
  const current = i18n.language.startsWith("zh") ? "zh-CN" : "en";
  return (
    <>
      <Divider seed={seed + "lang"} />
      <RMenu.Group>
        <RMenu.Label className="zf-menu__langlabel">{t("nav.language")}</RMenu.Label>
        <RMenu.RadioGroup
          value={current}
          onValueChange={(code) => void i18n.changeLanguage(code)}
          className="zf-menu__lang"
        >
          {LANGUAGES.map((l) => (
            <RMenu.RadioItem
              key={l.code}
              value={l.code}
              lang={l.code}
              className="zf-menu__langopt"
            >
              {l.label}
            </RMenu.RadioItem>
          ))}
        </RMenu.RadioGroup>
      </RMenu.Group>
    </>
  );
}

/** "EN · 中文", right on the bar: two plain buttons, the current one underlined. */
export function LanguageSwitch() {
  const { t, i18n } = useTranslation();
  const current = i18n.language.startsWith("zh") ? "zh-CN" : "en";
  return (
    <div className="zf-lang" role="group" aria-label={t("nav.language")}>
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          lang={l.code}
          aria-pressed={current === l.code}
          onClick={() => void i18n.changeLanguage(l.code)}
        >
          {l.code === "en" ? "EN" : l.label}
          {current === l.code && <Circled seed={"lang" + l.code} weight={1.8} />}
        </button>
      ))}
    </div>
  );
}

/**
 * The top band: wordmark, main navigation (Make, Library, Friends, Together), the language switch
 * and the avatar menu. It holds no slogan. A peach scrap torn on the bottom edge only (xl, flush,
 * measured). Under 760px the navigation moves into one menu; the language switch stays on the bar.
 */
export function Masthead({
  user,
  onLogout,
  pathname,
}: {
  user: MastheadUser | null;
  onLogout?: () => void;
  pathname: string;
}) {
  const { t } = useTranslation();
  ensureFontsFor(user?.name);
  // the auth card already carries the page's one primary button
  const onAuth = pathname === "/login" || pathname === "/signup";
  const inLibrary = ["/stickers", "/tapes", "/journals", "/collections"].some((p) =>
    pathname.startsWith(p),
  );
  const onFriends = pathname.startsWith("/friends");
  const onTogether = pathname.startsWith("/together");

  // Make opens its dialog right here: no page change
  const show = useMake((s) => s.show);
  const makeItems: MenuItem[] = MAKE_ITEMS.map((m) => ({
    icon: m.icon,
    label: t(`nav.makeItems.${m.key}`),
    onSelect: () => show(m.key),
  }));
  const invites = user?.invites ?? 0;
  const placeItems: MenuItem[] = [
    { to: "/stickers", icon: "folder", label: t("nav.library"), current: inLibrary },
    {
      to: "/friends",
      icon: "users",
      label: t("nav.friends"),
      current: onFriends,
      count: user?.pending ?? 0,
    },
    {
      to: "/together",
      icon: "journal",
      label: t("nav.together"),
      current: onTogether,
      dot: invites > 0 ? t("nav.invites", { count: invites }) : undefined,
    },
  ];
  const accountItems: MenuItem[] = [
    {
      to: "/account",
      icon: "gear",
      label: t("nav.profile"),
      current: pathname.startsWith("/account"),
    },
    { icon: "logout", label: t("nav.logOut"), onSelect: onLogout },
  ];

  const pending = user?.pending ?? 0;

  return (
    <header className="zf-masthead is-sticky">
      <Paper
        seed="mast"
        size="xl"
        edges="b"
        flush
        tone="peach-100"
        rotate={0}
        w={1280}
        h={80}
        measure
      >
        <div className="zf-masthead__row">
          <Wordmark />
          {user ? (
            <>
              <nav className="zf-nav" aria-label={t("nav.main")}>
                <Menu>
                  <RMenu.Trigger asChild>
                    <button type="button" className="zf-nav__make">
                      {t("nav.make")}
                    </button>
                  </RMenu.Trigger>
                  <MenuContent groups={[makeItems]} seed="make" align="start" />
                </Menu>
                <NavLink to="/stickers" aria-current={inLibrary ? "page" : undefined}>
                  {t("nav.library")}
                  {inLibrary && <Scribble seed="nav-lib" weight={2} />}
                </NavLink>
                <NavLink to="/friends" aria-current={onFriends ? "page" : undefined}>
                  {t("nav.friends")}
                  {pending > 0 && (
                    <span
                      className="zf-badge"
                      aria-label={t("nav.pending", { count: pending })}
                    >
                      {pending}
                    </span>
                  )}
                  {onFriends && <Scribble seed="nav-fr" weight={2} />}
                </NavLink>
                <NavLink to="/together" aria-current={onTogether ? "page" : undefined}>
                  {t("nav.together")}
                  {invites > 0 && (
                    <span
                      className="zf-alertdot"
                      role="img"
                      aria-label={t("nav.invites", { count: invites })}
                    />
                  )}
                  {onTogether && <Scribble seed="nav-tg" weight={2} />}
                </NavLink>
                <span style={{ width: 8 }} />
                <Menu>
                  <RMenu.Trigger asChild>
                    <button
                      type="button"
                      className="zf-acct"
                      aria-label={t("nav.accountMenu", { name: user.name })}
                    >
                      <Avatar
                        name={user.name}
                        src={user.avatar}
                        kind={user.avatarKind}
                        asStatic
                      />
                      <span className="zf-acct__name">{shortName(user.name)}</span>
                    </button>
                  </RMenu.Trigger>
                  <MenuContent user={user} groups={[accountItems]} seed="menu" language />
                </Menu>
              </nav>
              <span className="zf-menu-btn">
                <Menu>
                  <RMenu.Trigger asChild>
                    <Button variant="quiet" icon="menu" seed="mb">
                      {t("common.menu")}
                      {/* on a phone everything lives in this menu: say when something is waiting in it */}
                      {(user.pending ?? 0) + (user.invites ?? 0) > 0 && (
                        <span
                          className="zf-alertdot"
                          role="img"
                          aria-label={t("nav.waitingTotal", {
                            count: (user.pending ?? 0) + (user.invites ?? 0),
                          })}
                        />
                      )}
                    </Button>
                  </RMenu.Trigger>
                  <MenuContent
                    user={user}
                    groups={[makeItems, placeItems, accountItems]}
                    seed="mm"
                    language
                  />
                </Menu>
              </span>
            </>
          ) : (
            <div
              className="zf-nav"
              style={{ display: "flex", marginLeft: "auto", gap: 4 }}
            >
              <LanguageSwitch />
              {/* on a phone the log in / sign up pages link to each other, and the bar has no room */}
              <ButtonLink
                variant="quiet"
                to="/login"
                seed="li"
                className={onAuth ? "zf-hide-m-auth" : undefined}
              >
                {t("nav.logIn")}
              </ButtonLink>
              <ButtonLink
                variant={onAuth ? "secondary" : "primary"}
                size="sm"
                to="/signup"
                seed="su"
              >
                {t("nav.signUp")}
              </ButtonLink>
            </div>
          )}
        </div>
      </Paper>
    </header>
  );
}
