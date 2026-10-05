import { useTranslation } from "react-i18next";
import { Dialog } from "@/components/ui/Dialog";
import { TapeTile } from "./TapeTile";
import { useStarterTapes } from "./starters";
import type { TapeSpec } from "./tape.schema";
import { useTapes } from "./useTapes";

/** Choose one of your tapes (or a starter) to stick on a journal page. */
export function TapePickerDialog({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (tape: TapeSpec) => void;
}) {
  const { t } = useTranslation();
  const { data: mine = [] } = useTapes();
  const starters = useStarterTapes();
  const all: { tape: TapeSpec; key: string; starter: boolean }[] = [
    ...mine.map((tape) => ({ tape, key: tape.id, starter: false })),
    ...starters.map((tape, i) => ({ tape, key: "starter" + i, starter: true })),
  ];
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      width={760}
      sheet
      seed="tape-picker"
      tapes={1}
      title={t("journal.pickTape")}
    >
      <ul
        className="zf-grid-tape"
        style={{ listStyle: "none", margin: "12px 0 6px", padding: 0 }}
      >
        {all.map(({ tape, key, starter }, i) => (
          <li key={key}>
            <TapeTile
              tape={tape}
              index={i}
              starter={starter}
              selecting
              onToggle={() => onPick(tape)}
              pickMode
            />
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
