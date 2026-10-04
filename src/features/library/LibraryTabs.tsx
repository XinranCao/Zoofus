import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { Scribble } from "@/components/ui/Scribble";

const TABS = [
  { to: "/stickers", key: "stickers" },
  { to: "/tapes", key: "tapes" },
  { to: "/journals", key: "journals" },
  { to: "/collections", key: "collections" },
] as const;

/**
 * The kinds of things you keep: Stickers, Tapes, Journals and your own Collections. One list per
 * page, always visible (it wraps instead of hiding on a narrow screen).
 */
export function LibraryTabs() {
  const { t } = useTranslation();
  return (
    <nav className="zf-tabs" aria-label={t("library.tabs")}>
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={false}>
          {({ isActive }) => (
            <>
              <span aria-current={isActive ? "page" : undefined}>
                {t(`library.${tab.key}`)}
              </span>
              {isActive && <Scribble seed={"tab" + tab.to} weight={2} />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
