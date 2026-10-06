import { ensureFontsFor } from "@/lib/cjkFonts";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { SelectMark } from "@/components/ui/SelectMark";
import { TextField } from "@/components/ui/TextField";
import { cn } from "@/lib/cn";
import { seededRot } from "@/paper/random";
import { MAX_STICKER_NAME, type Sticker } from "./sticker.schema";

/** The finished sticker as saved: the cut-out with its edge baked in, shown as an image. */
/** Height of a tile with its name, date and actions: the loading skeleton reserves the same room, so nothing shifts when stickers arrive. */
export const TILE_HEIGHT = 310;

export function StickerImage({
  sticker,
  size,
  rotate = 4,
  interactive,
}: {
  sticker: Sticker;
  size: number;
  rotate?: number;
  interactive?: boolean;
}) {
  const k = size / Math.max(sticker.width, sticker.height);
  return (
    <span
      className={cn("zf-sticker", interactive && "is-interactive")}
      style={
        {
          "--rot": rotate === 0 ? "0deg" : seededRot(sticker.id, rotate),
        } as CSSProperties
      }
    >
      <img
        className="zf-sticker-img"
        src={sticker.imageUrl}
        alt={sticker.name}
        width={Math.round(sticker.width * k)}
        height={Math.round(sticker.height * k)}
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}

/** The in-place rename field: Enter saves, Esc cancels. Mounted only while renaming. */
function RenameField({
  sticker,
  onDone,
}: {
  sticker: Sticker;
  onDone: (name: string | null) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(sticker.name);
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    field.current?.focus();
    field.current?.select();
  }, []);
  return (
    <div style={{ width: "100%", maxWidth: 190 }}>
      <TextField
        ref={field}
        label={t("book.nameLabel")}
        value={draft}
        maxLength={MAX_STICKER_NAME}
        seed={"rn" + sticker.id}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onDone(draft.trim() || null);
          if (e.key === "Escape") {
            e.stopPropagation();
            onDone(null);
          }
        }}
        onBlur={() => onDone(null)}
      />
    </div>
  );
}

/**
 * One sticker in a grid: the sticker, its name and the date. In the book it opens the detail dialog
 * and shows Rename / Delete on hover or focus (always on touch). Rename happens in place: Enter
 * saves, Esc cancels.
 */
export function StickerTile({
  sticker,
  size = 96,
  date,
  onOpen,
  onRename,
  onDelete,
  onShare,
  onEditEdge,
  renaming,
  onRenameDone,
  selecting,
  selected,
  onToggle,
}: {
  sticker: Sticker;
  size?: number;
  date: string;
  onOpen?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  /** Offered for a sticker whose edge can be redone. */
  onEditEdge?: () => void;
  renaming?: boolean;
  onRenameDone?: (name: string | null) => void;
  /** Bulk-select mode: a tap picks the sticker instead of opening it. */
  selecting?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}) {
  ensureFontsFor(sticker.name);
  const { t } = useTranslation();
  const body = (
    <>
      {selecting && <SelectMark selected={Boolean(selected)} />}
      <div className="zf-tile__name">{sticker.name}</div>
      <div
        style={{
          height: size + 14,
          display: "grid",
          placeItems: "center",
          position: "relative",
        }}
      >
        <StickerImage sticker={sticker} size={size} interactive />
      </div>
      {/* one caption: the name; the date only for a sticker that has none */}
      {date && !sticker.name && <div className="zf-tile__meta">{date}</div>}
    </>
  );

  return (
    <figure
      data-sticker-id={sticker.id}
      className={cn("zf-tile", selecting && "is-selecting", selected && "is-selected")}
    >
      {selecting ? (
        <button
          type="button"
          className="zf-tile__open"
          aria-pressed={Boolean(selected)}
          aria-label={sticker.name}
          onClick={onToggle}
        >
          {body}
        </button>
      ) : renaming ? (
        <>
          <RenameField sticker={sticker} onDone={(name) => onRenameDone?.(name)} />
          <div style={{ height: size + 14, display: "grid", placeItems: "center" }}>
            <StickerImage sticker={sticker} size={size} />
          </div>
        </>
      ) : onOpen ? (
        <button
          type="button"
          className="zf-tile__open"
          onClick={onOpen}
          aria-label={t("book.preview", { name: sticker.name })}
        >
          {body}
        </button>
      ) : (
        <div className="zf-tile__open" style={{ cursor: "default" }}>
          {body}
        </div>
      )}
      {(onRename || onDelete || onShare || onEditEdge) && !renaming && !selecting && (
        <div
          className="zf-tile__actions"
          role="group"
          aria-label={t("book.actionsFor", { name: sticker.name })}
        >
          {onShare && (
            <Button
              variant="quiet"
              size="sm"
              icon="send"
              seed={"sh-b" + sticker.id}
              onClick={onShare}
              aria-label={`${t("bulk.share")}: ${sticker.name}`}
            >
              {t("bulk.share")}
            </Button>
          )}
          {onEditEdge && sticker.kind === "editable" && (
            <Button
              variant="quiet"
              size="sm"
              icon="pen"
              seed={"ee-b" + sticker.id}
              onClick={onEditEdge}
              aria-label={`${t("book.editEdge")}: ${sticker.name}`}
            >
              {t("book.editEdge")}
            </Button>
          )}
          {onRename && (
            <Button
              variant="quiet"
              size="sm"
              icon="pencil"
              seed={"rn-b" + sticker.id}
              onClick={onRename}
              aria-label={`${t("common.rename")}: ${sticker.name}`}
            >
              {t("common.rename")}
            </Button>
          )}
          {onDelete && (
            <Button
              variant="quiet"
              size="sm"
              icon="trash"
              seed={"dl-b" + sticker.id}
              onClick={onDelete}
              aria-label={`${t("common.delete")}: ${sticker.name}`}
            >
              {t("common.delete")}
            </Button>
          )}
        </div>
      )}
    </figure>
  );
}
