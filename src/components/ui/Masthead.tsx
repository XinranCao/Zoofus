import * as RMenu from "@radix-ui/react-dropdown-menu";
import { useTranslation } from "react-i18next";
import { Link, NavLink } from "react-router-dom";
import { tornClip } from "@/paper/torn";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { LANGUAGES } from "@/i18n";
import { ensureFontsFor } from "@/lib/cjkFonts";
import { Avatar } from "./Avatar";
import { Button, ButtonLink } from "./Button";
import { Icon, type IconName } from "./Icon";
import { Paper } from "./Paper";
import { Divider, Scribble } from "./Scribble";
import { Wordmark } from "./Wordmark";

export interface MastheadUser {
  name: string;
  email?: string;
  avatar?: string | null;
}

interface MenuItem {
  to?: string;
  icon: IconName;
  label: string;
  onSelect?: () => void;
  current?: boolean;
}

/** The account / mobile menu: a flat scrap Paper (Radix DropdownMenu, arrow keys, typeahead). */
function MenuContent({
  user,
  items,
  seed,
}: {
  user: MastheadUser;
  items: MenuItem[];
  seed: string;
}) {
  const { t, i18n } = useTranslation();
  const current = i18n.language.startsWith("zh") ? "zh-CN" : "en";
  const style = {
    "--clip-item": tornClip(seed + "i", { size: "xs", w: 200, h: 36 }),
  } as CSSProperties;
  return (
    <RMenu.Portal>
      <RMenu.Content asChild align="end" sideOffset={10} collisionPadding={12}>
        <Paper
          seed={seed}
          size="md"
          tone="scrap"
          rotate={0.5}
          className="zf-menu z-50"
          style={{ minWidth: 230, ...style }}
        >
          <div
            style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 8px" }}
          >
            <Avatar
              name={user.name}
              src={user.avatar}
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
          {items
            .filter((it) => it.icon !== "logout")
            .map((it) => (
              <RMenu.Item key={it.label} asChild onSelect={it.onSelect}>
                {it.to ? (
                  <Link
                    to={it.to}
                    className={"zf-menu__item" + (it.current ? " is-active" : "")}
                    aria-current={it.current ? "page" : undefined}
                  >
                    <Icon name={it.icon} />
                    {it.label}
                  </Link>
                ) : (
                  <button type="button" className="zf-menu__item">
                    <Icon name={it.icon} />
                    {it.label}
                  </button>
                )}
              </RMenu.Item>
            ))}
          <Divider seed={seed + "l"} />
          {/* "EN · 中文": two radio items in a group, set as one segmented control */}
          <RMenu.RadioGroup
            value={current}
            onValueChange={(code) => void i18n.changeLanguage(code)}
            aria-label={t("nav.language")}
            className="zf-menu__lang"
          >
            <Icon name="globe" />
            {LANGUAGES.map((l) => (
              <RMenu.RadioItem
                key={l.code}
                value={l.code}
                className="zf-menu__langopt"
                lang={l.code}
              >
                {l.code === "en" ? "EN" : l.label}
              </RMenu.RadioItem>
            ))}
          </RMenu.RadioGroup>
          {items
            .filter((it) => it.icon === "logout")
            .map((it) => (
              <RMenu.Item key={it.label} asChild onSelect={it.onSelect}>
                {it.to ? (
                  <Link
                    to={it.to}
                    className={"zf-menu__item" + (it.current ? " is-active" : "")}
                    aria-current={it.current ? "page" : undefined}
                  >
                    <Icon name={it.icon} />
                    {it.label}
                  </Link>
                ) : (
                  <button type="button" className="zf-menu__item">
                    <Icon name={it.icon} />
                    {it.label}
                  </button>
                )}
              </RMenu.Item>
            ))}
        </Paper>
      </RMenu.Content>
    </RMenu.Portal>
  );
}

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

/**
 * The top band: wordmark, main navigation and the avatar menu. It holds no slogan. A peach scrap
 * torn on the bottom edge only (xl, flush, measured). Under 760px a menu button replaces the nav.
 * Sticky on desktop; flat, so its torn edge and lip separate it from the content.
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
  const { t, i18n } = useTranslation();
  const zh = i18n.language.startsWith("zh");
  ensureFontsFor(user?.name);
  const other = LANGUAGES.find((l) => (zh ? l.code === "en" : l.code === "zh-CN"))!;
  // the auth card already carries the page's one primary button
  const onAuth = pathname === "/login" || pathname === "/signup";
  const toggleLanguage = () => void i18n.changeLanguage(other.code);
  const onBook = pathname.startsWith("/stickers") || pathname.startsWith("/tape");

  const links = [
    { to: "/", label: t("nav.make"), current: pathname === "/" },
    { to: "/stickers", label: t("nav.book"), current: onBook },
  ];
  const desktopItems: MenuItem[] = user
    ? [
        { to: "/stickers", icon: "book", label: t("nav.book"), current: onBook },
        {
          to: "/account",
          icon: "gear",
          label: t("nav.profile"),
          current: pathname.startsWith("/account"),
        },
        { icon: "logout", label: t("nav.logOut"), onSelect: onLogout },
      ]
    : [];
  const mobileItems: MenuItem[] = user
    ? [
        { to: "/", icon: "lasso", label: t("nav.make"), current: pathname === "/" },
        { to: "/stickers", icon: "book", label: t("nav.book"), current: onBook },
        {
          to: "/account",
          icon: "gear",
          label: t("nav.profile"),
          current: pathname.startsWith("/account"),
        },
        { icon: "logout", label: t("nav.logOut"), onSelect: onLogout },
      ]
    : [];

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
                {links.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end
                    aria-current={l.current ? "page" : undefined}
                  >
                    {l.label}
                    {l.current && <Scribble seed={"nav" + l.to} weight={2} />}
                  </NavLink>
                ))}
                <span style={{ width: 8 }} />
                <Menu>
                  <RMenu.Trigger asChild>
                    <Avatar
                      name={user.name}
                      src={user.avatar}
                      aria-label={t("nav.accountMenu", { name: user.name })}
                    />
                  </RMenu.Trigger>
                  <MenuContent user={user} items={desktopItems} seed="menu" />
                </Menu>
              </nav>
              <span className="zf-menu-btn">
                <Menu>
                  <RMenu.Trigger asChild>
                    <Button
                      variant="quiet"
                      icon="menu"
                      seed="mb"
                      aria-label={t("common.menu")}
                    />
                  </RMenu.Trigger>
                  <MenuContent user={user} items={mobileItems} seed="mm" />
                </Menu>
              </span>
            </>
          ) : (
            <div
              className="zf-nav"
              style={{ display: "flex", marginLeft: "auto", gap: 4 }}
            >
              <Button
                variant="quiet"
                size="sm"
                icon="globe"
                seed="lang"
                onClick={toggleLanguage}
              >
                {other.label}
              </Button>
              <ButtonLink variant="quiet" to="/login" seed="li">
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
