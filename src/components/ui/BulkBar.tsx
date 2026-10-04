import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./Button";
import { Paper } from "./Paper";

/**
 * The bar that appears while you are picking many things at once: how many are picked, select all,
 * the actions that apply, and Done. It sticks to the bottom of the screen.
 */
export function BulkBar({
  count,
  total,
  onSelectAll,
  onClear,
  onDone,
  children,
}: {
  count: number;
  total: number;
  onSelectAll: () => void;
  onClear: () => void;
  onDone: () => void;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="zf-bulkbar" role="region" aria-label={t("bulk.bar")}>
      <Paper
        seed="bulkbar"
        size="sm"
        tone="scrap-warm"
        rotate={0.3}
        measure
        style={{ width: "100%" }}
      >
        <span role="status" aria-live="polite" className="zf-h2" style={{ fontSize: 16 }}>
          {t("bulk.selected", { count })}
        </span>
        <Button
          variant="quiet"
          size="sm"
          seed="bsa"
          onClick={count === total ? onClear : onSelectAll}
        >
          {count === total && total > 0 ? t("bulk.none") : t("bulk.all")}
        </Button>
        <span style={{ flex: 1 }} />
        {children}
        <Button variant="secondary" size="sm" icon="check" seed="bdone" onClick={onDone}>
          {t("bulk.done")}
        </Button>
      </Paper>
    </div>
  );
}
