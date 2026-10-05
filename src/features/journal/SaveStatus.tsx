import { useTranslation } from "react-i18next";

export type SaveState = "saved" | "saving" | "pending";

/**
 * The one plain line that says where a journal stands, in the editor and in Together: text only,
 * in a polite live region, so it is announced and never takes focus.
 */
export function SaveStatus({ state }: { state: SaveState }) {
  const { t } = useTranslation();
  return (
    <span role="status" className="zf-savestate">
      {t(`journal.status.${state}`)}
    </span>
  );
}
