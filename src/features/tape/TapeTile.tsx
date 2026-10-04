import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Paper } from "@/components/ui/Paper";
import { SelectMark } from "@/components/ui/SelectMark";
import { Tape } from "@/components/ui/Tape";
import { cn } from "@/lib/cn";
import { ensureFontsFor } from "@/lib/cjkFonts";
import type { TapeSpec } from "./tape.schema";

export type TapeEntry = TapeSpec & { id?: string };

/** One tape in the collection: a strip across a small scrap, its name, and what you can do with it. */
export function TapeTile({
  tape,
  index,
  starter,
  selecting,
  selected,
  onToggle,
  pickMode,
  onUse,
  onDelete,
}: {
  tape: TapeEntry;
  index: number;
  starter?: boolean;
  selecting?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  /** A picking list: the tile is a plain button (no tick mark). */
  pickMode?: boolean;
  onUse?: () => void;
  onDelete?: () => void;
}) {
  const { t } = useTranslation();
  ensureFontsFor(tape.name);
  const key = tape.id ?? "starter" + index;
  const body = (
    <>
      {selecting && !pickMode && <SelectMark selected={Boolean(selected)} />}
      <span className="zf-tapetile__stage">
        <Paper
          seed={"tt" + key}
          size="sm"
          tone="scrap-warm"
          rotate={1.2}
          w={150}
          h={80}
          style={{ width: "100%" }}
          faceStyle={{ height: 78 }}
        >
          {null}
        </Paper>
        <Tape
          pattern={tape.pattern}
          angle={-8 + (index % 4) * 5}
          length={Math.min(110, tape.thickness > 24 ? 100 : 104)}
          thickness={tape.thickness * 0.9}
          opacity={tape.opacity}
          ends={tape.ends}
          x="50%"
          y="50%"
          seed={"tp" + key}
        />
      </span>
      <span className="zf-tapetile__name">{tape.name}</span>
    </>
  );
  return (
    <figure
      className={cn(
        "zf-tapetile",
        selecting && "is-selecting",
        selected && "is-selected",
      )}
    >
      {selecting ? (
        <button
          type="button"
          className="zf-tapetile__open"
          aria-pressed={pickMode ? undefined : Boolean(selected)}
          aria-label={tape.name}
          onClick={onToggle}
        >
          {body}
        </button>
      ) : (
        <div className="zf-tapetile__open" style={{ cursor: "default" }}>
          {body}
        </div>
      )}
      {!selecting && (
        <div
          className="zf-tile__actions"
          role="group"
          aria-label={t("tape.actionsFor", { name: tape.name })}
        >
          {onUse && (
            <Button
              variant="quiet"
              size="sm"
              icon="copy"
              seed={"use" + key}
              aria-label={t("tape.use", { name: tape.name })}
              onClick={onUse}
            >
              {t("tape.makeLike")}
            </Button>
          )}
          {!starter && onDelete && (
            <Button
              variant="quiet"
              size="sm"
              icon="trash"
              seed={"del" + key}
              aria-label={t("tape.remove", { name: tape.name })}
              onClick={onDelete}
            >
              {t("common.delete")}
            </Button>
          )}
        </div>
      )}
    </figure>
  );
}
