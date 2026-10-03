import * as RMenu from "@radix-ui/react-dropdown-menu";
import { useTranslation } from "react-i18next";
import { Link, NavLink } from "react-router-dom";
import { tornClip } from "@/paper/torn";
import type { CSSProperties } from "react";
import { LANGUAGES } from "@/i18n";
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
            <Avatar name={user.name} src={user.avatar} size={34} asStatic />
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
          {items.map((it) => (
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
  const other = LANGUAGES.find((l) => (zh ? l.code === "en" : l.code === "zh-CN"))!;
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
        { icon: "globe", label: other.label, onSelect: toggleLanguage },
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
        { icon: "globe", label: other.label, onSelect: toggleLanguage },
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
                <RMenu.Root>
                  <RMenu.Trigger asChild>
                    <Avatar
                      name={user.name}
                      src={user.avatar}
                      aria-label={t("nav.accountMenu", { name: user.name })}
                    />
                  </RMenu.Trigger>
                  <MenuContent user={user} items={desktopItems} seed="menu" />
                </RMenu.Root>
              </nav>
              <span className="zf-menu-btn">
                <RMenu.Root>
                  <RMenu.Trigger asChild>
                    <Button
                      variant="quiet"
                      icon="menu"
                      seed="mb"
                      aria-label={t("common.menu")}
                    />
                  </RMenu.Trigger>
                  <MenuContent user={user} items={mobileItems} seed="mm" />
                </RMenu.Root>
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
              <ButtonLink variant="primary" size="sm" to="/signup" seed="su">
                {t("nav.signUp")}
              </ButtonLink>
            </div>
          )}
        </div>
      </Paper>
    </header>
  );
}
