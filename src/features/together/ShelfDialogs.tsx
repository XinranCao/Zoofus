import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useCollections } from "@/features/collections/useCollections";
import { useStickers } from "@/features/stickers/library/useStickers";
import { StickerTile } from "@/features/stickers/library/StickerTile";
import { TapeTile } from "@/features/tape/TapeTile";
import { useStarterTapes } from "@/features/tape/starters";
import type { TapeSpec } from "@/features/tape/tape.schema";
import { useTapes } from "@/features/tape/useTapes";
import { cn } from "@/lib/cn";
import { addStickerToShelf, addTapeToShelf } from "./workspace.api";
import type { ShelfEntry } from "./workspace.schema";

const MAX_PER_BRING = 30;

/** The stickers on the shared shelf: everything every member has brought in. */
export function ShelfStickerPicker({
  open,
  onClose,
  onPick,
  shelf,
  names,
  onBringIn,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (ref: string) => void;
  shelf: ShelfEntry[];
  names: Map<string, string>;
  onBringIn: () => void;
}) {
  const { t } = useTranslation();
  const stickers = shelf.filter(
    (s): s is Extract<ShelfEntry, { kind: "sticker" }> => s.kind === "sticker",
  );
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      width={760}
      sheet
      seed="shelf-stickers"
      tapes={1}
      title={t("together.shelfStickers")}
      actions={
        <Button variant="secondary" icon="plus" seed="sbring" onClick={onBringIn}>
          {t("together.addFromLibrary")}
        </Button>
      }
    >
      <div style={{ margin: "12px 0 6px" }}>
        {stickers.length === 0 ? (
          <EmptyState seed="shelf-empty" title={t("together.shelfEmpty")}>
            {t("together.shelfEmptyBody")}
          </EmptyState>
        ) : (
          <ul
            className="zf-grid-picker"
            style={{ listStyle: "none", margin: 0, padding: 0 }}
          >
            {stickers.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={cn("zf-picker__item")}
                  aria-label={s.name}
                  onClick={() => onPick("a:" + s.id)}
                >
                  <span className="zf-sticker" style={{ ["--rot" as string]: "3deg" }}>
                    <img
                      className="zf-sticker-img"
                      src={s.url}
                      alt=""
                      width={Math.round((84 * s.w) / Math.max(s.w, s.h))}
                      height={Math.round((84 * s.h) / Math.max(s.w, s.h))}
                      loading="lazy"
                    />
                  </span>
                  <span className="zf-tile__meta">{s.name}</span>
                  <span className="zf-tile__meta">{names.get(s.owner) ?? ""}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}

/** The tapes everyone can use on the shared page: the starters, and any a member brought in. */
export function ShelfTapePicker({
  open,
  onClose,
  onPick,
  shelf,
  onBringIn,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (tape: TapeSpec) => void;
  shelf: ShelfEntry[];
  onBringIn: () => void;
}) {
  const { t } = useTranslation();
  const starters = useStarterTapes();
  const brought: { key: string; tape: TapeSpec }[] = shelf.flatMap((s) =>
    s.kind === "tape" ? [{ key: s.id, tape: { name: s.name, ...s.tape } }] : [],
  );
  const all = [...brought, ...starters.map((tape, i) => ({ key: "starter" + i, tape }))];
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      width={760}
      sheet
      seed="shelf-tapes"
      tapes={1}
      title={t("together.shelfTapes")}
      actions={
        <Button variant="secondary" icon="plus" seed="tbring" onClick={onBringIn}>
          {t("together.addFromLibrary")}
        </Button>
      }
    >
      <ul
        className="zf-grid-tape"
        style={{ listStyle: "none", margin: "12px 0 6px", padding: 0 }}
      >
        {all.map(({ key, tape }, i) => (
          <li key={key}>
            <TapeTile
              tape={tape}
              index={i}
              selecting
              pickMode
              onToggle={() => onPick(tape)}
            />
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

/**
 * Bring your own stickers and tapes onto the shared shelf. You choose which: tick the pieces, or
 * use "All" and the collection shortcuts to tick many at once.
 */
export function BringInDialog({
  open,
  onClose,
  workspaceId,
  me,
}: {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  me: string;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: stickers = [] } = useStickers();
  const { data: tapes = [] } = useTapes();
  const { data: collections = [] } = useCollections();
  const [busy, setBusy] = useState(false);
  const [pickedStickers, setPickedStickers] = useState<Set<string>>(new Set());
  const [pickedTapes, setPickedTapes] = useState<Set<string>>(new Set());

  const total = pickedStickers.size + pickedTapes.size;
  const flip = (set: Set<string>, id: string, limit: number) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else if (next.size < limit) next.add(id);
    return next;
  };
  const addMany = (set: Set<string>, ids: string[]) =>
    new Set([...set, ...ids].slice(0, MAX_PER_BRING));

  const close = () => {
    if (busy) return;
    setPickedStickers(new Set());
    setPickedTapes(new Set());
    onClose();
  };

  const bring = async () => {
    setBusy(true);
    let failed = 0;
    for (const s of stickers.filter((x) => pickedStickers.has(x.id)))
      await addStickerToShelf(workspaceId, me, s).catch(() => failed++);
    for (const tape of tapes.filter((x) => pickedTapes.has(x.id)))
      await addTapeToShelf(workspaceId, me, tape.name, tape).catch(() => failed++);
    setBusy(false);
    toast.push(
      failed
        ? {
            kind: "error",
            title: t("auth.errors.toastTitle"),
            body: t("together.bringFailed"),
          }
        : { kind: "success", title: t("together.brought", { count: total }) },
    );
    if (!failed) {
      setPickedStickers(new Set());
      setPickedTapes(new Set());
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && close()}
      width={720}
      sheet
      seed="bring-in"
      tapes={1}
      title={t("together.bringIn")}
      actions={
        <>
          <Button variant="quiet" seed="bic" disabled={busy} onClick={close}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            icon="check"
            seed="big"
            disabled={total === 0}
            loading={busy}
            onClick={() => void bring()}
          >
            {t("together.bringCount", { count: total })}
          </Button>
        </>
      }
    >
      <p style={{ margin: "6px 0 12px" }}>
        {t("together.bringInBody", { max: MAX_PER_BRING })}
      </p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        <Button
          variant="quiet"
          size="sm"
          seed="bi-all"
          disabled={stickers.length + tapes.length === 0}
          onClick={() => {
            setPickedStickers(
              addMany(
                new Set(),
                stickers.map((x) => x.id),
              ),
            );
            setPickedTapes(
              addMany(
                new Set(),
                tapes.map((x) => x.id),
              ),
            );
          }}
        >
          {t("bulk.all")}
        </Button>
        <Button
          variant="quiet"
          size="sm"
          seed="bi-none"
          disabled={total === 0}
          onClick={() => {
            setPickedStickers(new Set());
            setPickedTapes(new Set());
          }}
        >
          {t("bulk.none")}
        </Button>
        {collections.map((c) => (
          <Button
            key={c.id}
            variant="secondary"
            size="sm"
            icon="folder"
            seed={"bi-c" + c.id}
            disabled={c.items.length === 0}
            onClick={() => {
              setPickedStickers((p) =>
                addMany(
                  p,
                  c.items.flatMap((i) => (i.k === "sticker" ? [i.id] : [])),
                ),
              );
              setPickedTapes((p) =>
                addMany(
                  p,
                  c.items.flatMap((i) => (i.k === "tape" ? [i.id] : [])),
                ),
              );
            }}
          >
            {c.name}
          </Button>
        ))}
      </div>
      {stickers.length > 0 && (
        <>
          <div className="zf-label" style={{ marginBottom: 8 }}>
            {t("library.stickers")}
          </div>
          <ul
            className="zf-grid-bring"
            style={{ listStyle: "none", margin: "0 0 18px", padding: 0 }}
          >
            {stickers.map((s) => (
              <li key={s.id}>
                <StickerTile
                  sticker={s}
                  size={84}
                  date=""
                  selecting
                  selected={pickedStickers.has(s.id)}
                  onToggle={() => setPickedStickers((p) => flip(p, s.id, MAX_PER_BRING))}
                />
              </li>
            ))}
          </ul>
        </>
      )}
      {tapes.length > 0 && (
        <>
          <div className="zf-label" style={{ marginBottom: 8 }}>
            {t("library.tapes")}
          </div>
          <ul
            className="zf-grid-bring zf-grid-bring--tape"
            style={{ listStyle: "none", margin: "0 0 6px", padding: 0 }}
          >
            {tapes.map((tape, i) => (
              <li key={tape.id}>
                <TapeTile
                  tape={tape}
                  index={i}
                  selecting
                  selected={pickedTapes.has(tape.id)}
                  onToggle={() => setPickedTapes((p) => flip(p, tape.id, MAX_PER_BRING))}
                />
              </li>
            ))}
          </ul>
        </>
      )}
      {stickers.length + tapes.length === 0 && (
        <EmptyState seed="bring-empty" title={t("together.nothingToBring")}>
          {t("together.nothingToBringBody")}
        </EmptyState>
      )}
    </Dialog>
  );
}
