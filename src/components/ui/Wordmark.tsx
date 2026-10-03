import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

/**
 * The single "Zoofus" name in Special Elite. Never split, stack, recolour letters, rotate, put on
 * a sticker or follow with a tagline. A link to Home. On brick or plum use sheet-50.
 */
export function Wordmark({ style }: { style?: CSSProperties }) {
  const { t } = useTranslation();
  return (
    <Link to="/" className="zf-wordmark" aria-label={t("common.goHome")} style={style}>
      Zoofus
    </Link>
  );
}
