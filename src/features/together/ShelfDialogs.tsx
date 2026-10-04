import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { useCollections } from "@/features/collections/useCollections";
import { useStickers } from "@/features/stickers/library/useStickers";
import { TapeTile } from "@/features/tape/TapeTile";
import { STARTER_TAPES, type TapeSpec } from "@/features/tape/tape.schema";
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
        <Button variant="secondary" icon="folder" seed="sbring" onClick={onBringIn}>
          {t("together.bringIn")}
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
  const brought: { key: string; tape: TapeSpec }[] = shelf.flatMap((s) =>
    s.kind === "tape" ? [{ key: s.id, tape: { name: s.name, ...s.tape } }] : [],
  );
  const all = [
    ...brought,
    ...STARTER_TAPES.map((tape, i) => ({ key: "starter" + i, tape })),
  ];
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
        <Button variant="secondary" icon="folder" seed="tbring" onClick={onBringIn}>
          {t("together.bringIn")}
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

/** Bring your own stickers and tapes onto the shared shelf: all of them, or a collection of yours. */
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

  const bring = async (st: typeof stickers, tp: typeof tapes) => {
    setBusy(true);
    let failed = 0;
    const limited = st.slice(0, MAX_PER_BRING);
    for (const s of limited)
      await addStickerToShelf(workspaceId, me, s).catch(() => failed++);
    for (const tape of tp.slice(0, MAX_PER_BRING))
      await addTapeToShelf(workspaceId, me, tape.name, tape).catch(() => failed++);
    setBusy(false);
    toast.push(
      failed
        ? {
            kind: "error",
            title: t("auth.errors.toastTitle"),
            body: t("together.bringFailed"),
          }
        : {
            kind: "success",
            title: t("together.brought", {
              count: limited.length + Math.min(tp.length, MAX_PER_BRING),
            }),
          },
    );
    onClose();
  };

  const options: { key: string; label: string; count: number; run: () => void }[] = [
    {
      key: "all-stickers",
      label: t("together.allStickers"),
      count: stickers.length,
      run: () => void bring(stickers, []),
    },
    {
      key: "all-tapes",
      label: t("together.allTapes"),
      count: tapes.length,
      run: () => void bring([], tapes),
    },
    ...collections.map((c) => {
      const st = stickers.filter((s) =>
        c.items.some((i) => i.k === "sticker" && i.id === s.id),
      );
      const tp = tapes.filter((x) =>
        c.items.some((i) => i.k === "tape" && i.id === x.id),
      );
      return {
        key: c.id,
        label: c.name,
        count: st.length + tp.length,
        run: () => void bring(st, tp),
      };
    }),
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && !busy && onClose()}
      width={460}
      seed="bring-in"
      tapes={1}
      title={t("together.bringIn")}
    >
      <p style={{ margin: "6px 0 14px" }}>
        {t("together.bringInBody", { max: MAX_PER_BRING })}
      </p>
      <ul className="zf-pick-list">
        {options.map((o) => (
          <li key={o.key}>
            <button
              type="button"
              className="zf-menu__item"
              disabled={busy || o.count === 0}
              onClick={o.run}
            >
              <Icon name="folder" />
              <span style={{ flex: 1 }}>{o.label}</span>
              <span className="zf-muted" style={{ fontSize: 13 }}>
                {o.count}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
