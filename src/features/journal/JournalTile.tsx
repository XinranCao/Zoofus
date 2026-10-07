import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Paper } from "@/components/ui/Paper";
import { SelectMark } from "@/components/ui/SelectMark";
import { Tape } from "@/components/ui/Tape";
import { cn } from "@/lib/cn";
import { ensureFontsFor } from "@/lib/cjkFonts";
import type { Journal } from "./journal.schema";
import { PaperPreview } from "./PageSetup";

// the page drawn from its items, while its picture does not exist yet (loads Konva only then)
const LivePage = lazy(() => import("./JournalLivePage"));

/** One journal in a list: its picture (or its paper, until it has one), its title and what you can do. */
export function JournalTile({
  journal,
  date,
  index = 0,
  live = true,
  selecting,
  selected,
  onToggle,
  onRename,
  onDelete,
  onShare,
}: {
  journal: Journal;
  date?: string;
  index?: number;
  /** Draw the page from its items when it has no picture yet (a list limits how many do). */
  live?: boolean;
  selecting?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
}) {
  const { t } = useTranslation();
  ensureFontsFor(journal.title);
  const w = 180;
  const h = Math.round((w * journal.page.height) / journal.page.width);
  const picture = journal.thumbUrl ? (
    <img
      src={journal.thumbUrl}
      alt=""
      width={w}
      height={h}
      loading="lazy"
      decoding="async"
      style={{ display: "block", width: "100%", height: "auto" }}
    />
  ) : live && journal.items.length > 0 ? (
    <Suspense fallback={<PaperPreview page={journal.page} width={w} />}>
      <LivePage journal={journal} width={w - 12} />
    </Suspense>
  ) : (
    <PaperPreview page={journal.page} width={w} />
  );
  const inner = (
    <>
      {selecting && <SelectMark selected={Boolean(selected)} />}
      <span className="zf-tile__name" style={{ marginBottom: 4 }}>
        {journal.title}
      </span>
      <Paper
        seed={"jt" + journal.id}
        size="sm"
        tone="sheet-50"
        rotate={1.2}
        w={w}
        h={h}
        style={{ width: "100%" }}
        faceStyle={{ padding: 6, minHeight: 60 }}
        tape={
          index % 3 === 0 ? (
            <Tape seed={"jtp" + journal.id} x="50%" y="2px" length={54} thickness={16} />
          ) : undefined
        }
      >
        {picture}
      </Paper>
      {date && <span className="zf-tile__meta">{date}</span>}
    </>
  );
  return (
    <figure
      className={cn(
        "zf-tile",
        "zf-jtile",
        selecting && "is-selecting",
        selected && "is-selected",
      )}
    >
      {selecting ? (
        <button
          type="button"
          className="zf-tile__open"
          aria-pressed={Boolean(selected)}
          aria-label={journal.title}
          onClick={onToggle}
        >
          {inner}
        </button>
      ) : (
        <Link
          to={`/journals/${journal.id}`}
          className="zf-tile__open"
          aria-label={t("journal.open", { title: journal.title })}
        >
          {inner}
        </Link>
      )}
      {!selecting && (onRename || onDelete || onShare) && (
        <div
          className="zf-tile__actions"
          role="group"
          aria-label={t("journal.actionsFor", { title: journal.title })}
        >
          {onShare && (
            <Button
              variant="quiet"
              size="sm"
              icon="send"
              seed={"jsh" + journal.id}
              aria-label={`${t("bulk.share")}: ${journal.title}`}
              onClick={onShare}
            >
              {t("bulk.share")}
            </Button>
          )}
          {onRename && (
            <Button
              variant="quiet"
              size="sm"
              icon="pencil"
              seed={"jrn" + journal.id}
              aria-label={`${t("common.rename")}: ${journal.title}`}
              onClick={onRename}
            >
              {t("common.rename")}
            </Button>
          )}
          {onDelete && (
            <Button
              variant="quiet"
              size="sm"
              icon="trash"
              seed={"jdl" + journal.id}
              aria-label={`${t("common.delete")}: ${journal.title}`}
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
