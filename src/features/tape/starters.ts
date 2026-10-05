import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { STARTER_TAPES, type TapeSpec } from "./tape.schema";

/** The starter tapes, named in the language on screen (the stored names are English). */
export function useStarterTapes(): TapeSpec[] {
  const { t, i18n } = useTranslation();
  return useMemo(
    () =>
      STARTER_TAPES.map((tape, i) => ({
        ...tape,
        name: t(`tape.starterNames.${i}`, { defaultValue: tape.name }),
      })),
    // the names change with the language
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, i18n.language],
  );
}
