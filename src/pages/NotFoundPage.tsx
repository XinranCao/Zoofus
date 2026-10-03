import { useTranslation } from "react-i18next";
import { Sticker } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

/** A giant apricot "404" behind a taped note with one way back. */
export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div
      className="zf-page"
      style={{ display: "grid", placeItems: "center", paddingTop: 56 }}
    >
      <div style={{ position: "relative", textAlign: "center" }}>
        <div
          className="zf-display"
          aria-hidden="true"
          style={{
            fontSize: 120,
            lineHeight: 1,
            color: "var(--apricot-300)",
            transform: "rotate(-3deg)",
          }}
        >
          404
        </div>
        <EmptyState
          seed="404"
          tone="scrap"
          kicker={t("notFound.kicker")}
          title={t("notFound.title")}
          art={<Sticker art="leaf" size={60} />}
          action={
            <ButtonLink variant="primary" to="/" seed="gh">
              {t("notFound.action")}
            </ButtonLink>
          }
        >
          {t("notFound.body")}
        </EmptyState>
      </div>
    </div>
  );
}
