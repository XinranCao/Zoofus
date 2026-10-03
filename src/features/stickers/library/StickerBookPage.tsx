import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Loader";
import { Scribble } from "@/components/ui/Scribble";
import { Sticker as DemoSticker } from "@/components/ui/Sticker";
import { ToastNote, useToast } from "@/components/ui/Toast";
import { StickerMakerDialog } from "../editor/StickerMakerDialog";
import { EditEdgeDialog } from "./EditEdgeDialog";
import { StickerDetailDialog } from "./StickerDetailDialog";
import { StickerTile } from "./StickerTile";
import type { Sticker } from "./sticker.schema";
import { useDeleteSticker, useRenameSticker, useStickers } from "./useStickers";

const UNDO_MS = 6000;

/** The "Stickers | Tape" tabs of the book. */
export function BookTabs() {
  const { t } = useTranslation();
  const tabs = [
    { to: "/stickers", label: t("book.tabStickers") },
    { to: "/tape", label: t("book.tabTape") },
  ];
  return (
    <nav
      className="zf-nav"
      aria-label={t("book.tabs")}
      style={{ margin: "0 0 20px -10px" }}
    >
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end>
          {({ isActive }) => (
            <>
              <span aria-current={isActive ? "page" : undefined}>{tab.label}</span>
              {isActive && <Scribble seed={"tab" + tab.to} weight={2} />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default function StickerBookPage() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { data, isPending, isError } = useStickers();
  const remove = useDeleteSticker();
  const rename = useRenameSticker();

  const [detailId, setDetailId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [editEdgeId, setEditEdgeId] = useState<string | null>(null);
  const [makerOpen, setMakerOpen] = useState(false);
  // Deleted stickers disappear at once; the real delete runs after the Undo window.
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const pending = useRef(
    new Map<string, { timer: ReturnType<typeof setTimeout>; sticker: Sticker }>(),
  );

  const stickers = useMemo(
    () => (data ?? []).filter((s) => !hidden.has(s.id)),
    [data, hidden],
  );
  const find = (id: string | null) =>
    id ? ((data ?? []).find((s) => s.id === id) ?? null) : null;
  const date = (s: Sticker) =>
    new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" }).format(
      s.createdAt,
    );
  const longDate = (s: Sticker) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(s.createdAt);

  const runDelete = (sticker: Sticker) => {
    pending.current.delete(sticker.id);
    remove.mutate(sticker, {
      onError: () => {
        setHidden((h) => {
          const n = new Set(h);
          n.delete(sticker.id);
          return n;
        });
        toast.push({
          kind: "error",
          title: t("auth.errors.toastTitle"),
          body: t("book.deleteFailed"),
        });
      },
    });
  };

  // Leaving the page finishes any delete that is still waiting for its Undo window.
  useEffect(() => {
    const map = pending.current;
    return () => {
      map.forEach(({ timer, sticker }) => {
        clearTimeout(timer);
        runDelete(sticker);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs on unmount only
  }, []);

  const confirmDelete = () => {
    const sticker = find(confirmId);
    setConfirmId(null);
    setDetailId(null);
    if (!sticker) return;
    setHidden((h) => new Set(h).add(sticker.id));
    const timer = setTimeout(() => runDelete(sticker), UNDO_MS);
    pending.current.set(sticker.id, { timer, sticker });
    toast.push({
      kind: "info",
      title: t("book.deleted"),
      body: t("book.deletedBody", { name: sticker.name }),
      action: {
        label: t("book.undo"),
        onClick: () => {
          clearTimeout(timer);
          pending.current.delete(sticker.id);
          setHidden((h) => {
            const n = new Set(h);
            n.delete(sticker.id);
            return n;
          });
        },
      },
    });
  };

  const onRenameDone = (id: string, name: string | null) => {
    setRenamingId(null);
    const sticker = find(id);
    if (!name || !sticker || name === sticker.name) return;
    rename.mutate(
      { id, name },
      {
        onError: () =>
          toast.push({
            kind: "error",
            title: t("auth.errors.toastTitle"),
            body: t("book.renameFailed"),
          }),
      },
    );
  };

  const empty = !isPending && !isError && stickers.length === 0;
  const detail = find(detailId);

  return (
    <div className="zf-page">
      <BookTabs />
      <div
        style={{
          display: "flex",
          alignItems: "end",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 28,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div className="zf-kicker">
            {empty ? t("book.kickerEmpty") : t("book.kicker", { count: stickers.length })}
          </div>
          <h1 className="zf-display" style={{ marginTop: 4 }}>
            {t("book.title")}
          </h1>
        </div>
        {!empty && (
          <Button
            variant="primary"
            icon="plus"
            seed="nw"
            onClick={() => setMakerOpen(true)}
          >
            {t("book.newSticker")}
          </Button>
        )}
      </div>

      {isError && (
        <ToastNote
          kind="error"
          title={t("auth.errors.toastTitle")}
          body={t("book.loadError")}
          seed="book-error"
          role="alert"
        />
      )}
      {isPending && (
        <div className="zf-grid-book" aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} seed={"bsk" + i} width="100%" height={130} />
          ))}
        </div>
      )}
      {empty && (
        <div style={{ paddingTop: 24 }}>
          <EmptyState
            seed="bk"
            kicker={t("book.emptyKicker")}
            title={t("book.emptyTitle")}
            art={<DemoSticker art="star" size={70} />}
            action={
              <Button
                variant="primary"
                icon="upload"
                seed="eu"
                onClick={() => setMakerOpen(true)}
              >
                {t("book.makeFirst")}
              </Button>
            }
          >
            {t("book.emptyBody")}
          </EmptyState>
        </div>
      )}
      {stickers.length > 0 && (
        <div className="zf-grid-book">
          {stickers.map((s, i) => (
            <StickerTile
              key={s.id}
              sticker={s}
              size={96}
              tape={i % 5 === 2}
              date={t("book.cutOn", { date: date(s) })}
              onOpen={() => setDetailId(s.id)}
              onRename={() => setRenamingId(s.id)}
              onDelete={() => setConfirmId(s.id)}
              renaming={renamingId === s.id}
              onRenameDone={(name) => onRenameDone(s.id, name)}
            />
          ))}
        </div>
      )}

      <StickerDetailDialog
        sticker={detail}
        date={detail ? longDate(detail) : ""}
        onClose={() => setDetailId(null)}
        onRename={() => {
          setRenamingId(detailId);
          setDetailId(null);
        }}
        onDelete={() => setConfirmId(detailId)}
        onEditEdge={() => {
          setEditEdgeId(detailId);
          setDetailId(null);
        }}
      />
      <EditEdgeDialog sticker={find(editEdgeId)} onClose={() => setEditEdgeId(null)} />
      <Dialog
        open={confirmId !== null}
        onOpenChange={(o) => !o && setConfirmId(null)}
        width={420}
        seed="confirm-delete"
        tapes={1}
        title={t("book.deleteTitle", { name: find(confirmId)?.name ?? "" })}
        actions={
          <>
            <Button variant="quiet" seed="cdc" onClick={() => setConfirmId(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" icon="trash" seed="cdd" onClick={confirmDelete}>
              {t("common.delete")}
            </Button>
          </>
        }
      >
        <DialogBody>{t("book.deleteBody")}</DialogBody>
      </Dialog>
      <StickerMakerDialog open={makerOpen} onOpenChange={setMakerOpen} />
    </div>
  );
}
