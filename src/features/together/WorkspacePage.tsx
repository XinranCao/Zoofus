import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reel } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/features/auth/useAuth";
import { JournalStudio, type JournalExport } from "@/features/journal/JournalStudio";
import { AUTOSAVE_MS } from "@/features/journal/autosave";
import type { StickerResolver } from "@/features/journal/JournalCanvas";
import { useJournals } from "@/features/journal/useJournals";
import {
  JournalStoreProvider,
  useJournalState,
  useJournalStore,
} from "@/features/journal/store/journalStore";
import type { Op } from "@/features/journal/ops";
import type { Item, PageSpec } from "@/features/journal/journal.schema";
import { useProfile } from "@/features/profile/useProfile";
import { toInlinePicture } from "@/lib/inlinePicture";
import { downloadBlob } from "@/features/stickers/studio/export";
import { BringInDialog, ShelfStickerPicker, ShelfTapePicker } from "./ShelfDialogs";
import { createBatcher, type Batcher } from "./batcher";
import { MembersPanel } from "./MembersPanel";
import { usePublicProfiles } from "./useTogether";
import {
  heartbeat,
  leavePresence,
  putItem,
  removeItem,
  renameWorkspace,
  saveCopy,
  setWorkspacePage,
  setWorkspaceThumb,
  watchItems,
  watchPresence,
  watchShelf,
  watchWorkspace,
} from "./workspace.api";
import type { Presence, ShelfEntry, Workspace } from "./workspace.schema";
import { useAcceptInvite } from "./useTogether";

const COLORS = [
  "pink-200",
  "lime-300",
  "mustard-300",
  "apricot-300",
  "celery-200",
  "rose-400",
];

/** `/together/:id`: a journal page several friends are making at the same time. */
export default function WorkspacePage() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const me = currentUser?.uid ?? "";
  const [workspace, setWorkspace] = useState<Workspace | null | undefined>(undefined);

  useEffect(() => {
    return watchWorkspace(id, setWorkspace, () => setWorkspace(null));
  }, [id]);

  if (workspace === undefined)
    return (
      <div
        className="zf-page"
        style={{ display: "grid", placeItems: "center", minHeight: 320 }}
      >
        <Reel label={t("together.opening")} />
      </div>
    );
  if (!workspace || (!workspace.members.includes(me) && !workspace.invited.includes(me)))
    return (
      <div className="zf-page">
        <EmptyState
          seed="ws-gone"
          title={t("together.goneTitle")}
          action={
            <Button variant="primary" seed="wsg" onClick={() => navigate("/together")}>
              {t("together.backToTogether")}
            </Button>
          }
        >
          {t("together.goneBody")}
        </EmptyState>
      </div>
    );
  if (!workspace.members.includes(me)) return <InviteScreen workspace={workspace} />;
  return (
    <JournalStoreProvider>
      <Collab key={workspace.id} workspace={workspace} me={me} />
    </JournalStoreProvider>
  );
}

function InviteScreen({ workspace }: { workspace: Workspace }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const accept = useAcceptInvite();
  return (
    <div className="zf-page">
      <EmptyState
        seed="ws-invite"
        title={t("together.youAreInvited", { title: workspace.title })}
        action={
          <Button
            variant="primary"
            icon="check"
            seed="wsj"
            loading={accept.isPending}
            onClick={() => accept.mutate(workspace.id)}
          >
            {t("together.join")}
          </Button>
        }
      >
        {t("together.inviteBody")}{" "}
        <Button variant="quiet" seed="wsn" onClick={() => navigate("/together")}>
          {t("together.notNow")}
        </Button>
      </EmptyState>
    </div>
  );
}

function Collab({ workspace, me }: { workspace: Workspace; me: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const store = useJournalStore();
  const { data: profile } = useProfile(me);
  const { data: journals = [] } = useJournals();
  const [shelf, setShelf] = useState<ShelfEntry[]>([]);
  const [presence, setPresence] = useState<Presence[]>([]);
  const [title, setTitle] = useState(workspace.title);
  const [bringOpen, setBringOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const unsaved = useJournalState((s) => s.dirty);
  const exportRef = useRef<JournalExport>(null);
  const batchRef = useRef<Batcher<Item, PageSpec> | null>(null);
  const latest = useRef(workspace);
  useEffect(() => {
    latest.current = workspace;
  }, [workspace]);
  const people = usePublicProfiles(workspace.members);
  const names = useMemo(
    () => new Map([...people].map(([uid, p]) => [uid, p?.nickname ?? ""])),
    [people],
  );

  // A small picture of the page for the list. Edits themselves reach everyone at once; this only
  // refreshes the picture, at most once a minute while there are changes (the timer is not pushed
  // back by every edit) and whenever Save is pressed.
  const thumbTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const keepPicture = async () => {
    clearTimeout(thumbTimer.current);
    thumbTimer.current = undefined;
    batchRef.current?.flush(); // what I changed reaches everyone before the picture is kept
    const blob = await exportRef.current?.thumb();
    if (!blob) return;
    const small = await toInlinePicture(blob, { maxSide: 360, maxChars: 55000 });
    await setWorkspaceThumb(latest.current.id, small.url);
    store.getState().markSaved();
    setSavedAt(new Date());
  };
  const scheduleThumb = () => {
    if (thumbTimer.current) return;
    thumbTimer.current = setTimeout(() => {
      thumbTimer.current = undefined;
      void keepPicture().catch((err) =>
        console.warn("The page picture was not kept", err),
      );
    }, AUTOSAVE_MS);
  };
  useEffect(() => () => clearTimeout(thumbTimer.current), []);
  const saveNow = async () => {
    setSaving(true);
    try {
      await keepPicture();
      toast.push({ kind: "success", title: t("together.saved") });
    } catch (err) {
      console.error("Saving the page failed", err);
      toast.push({
        kind: "error",
        title: t("auth.errors.toastTitle"),
        body: `${t("journal.saveFailed")} (${(err as { code?: string }).code ?? (err as Error).name ?? "error"})`,
      });
    } finally {
      setSaving(false);
    }
  };

  // the page: what is already there, then every change anyone makes
  useEffect(() => {
    store.getState().load(workspace.page, []);
    const batcher = createBatcher<Item, PageSpec>(
      (id, item) =>
        item ? putItem(workspace.id, me, item) : removeItem(workspace.id, id),
      (page) => setWorkspacePage(workspace.id, page),
      (err) => {
        console.error("A change could not be shared", err);
        toast.push({
          kind: "error",
          title: t("auth.errors.toastTitle"),
          body: t("together.changeFailed"),
        });
      },
    );
    batchRef.current = batcher;
    window.addEventListener("pagehide", batcher.flush);
    store.getState().bind((ops: Op[]) => {
      scheduleThumb();
      for (const op of ops) {
        if (op.k === "put") batcher.put(op.item.id, op.item);
        else if (op.k === "del") batcher.put(op.id, null);
        else batcher.page(op.page);
      }
    });
    const stopItems = watchItems(
      workspace.id,
      ({ put, del }) => {
        // what is already on the page exactly as it comes in (the echo of my own change) is left
        // alone, so a quiet update never redraws something I am in the middle of editing
        const have = new Map(
          store.getState().items.map((i) => [i.id, JSON.stringify(i)]),
        );
        // (an object I have changed but not yet written is mine: an older copy coming back is ignored)
        const news = put.filter(
          (item) => !batcher.has(item.id) && have.get(item.id) !== JSON.stringify(item),
        );
        if (!news.length && !del.length) return;
        store
          .getState()
          .apply(
            [
              ...news.map((item) => ({ k: "put" as const, item })),
              ...del.map((id) => ({ k: "del" as const, id })),
            ],
            { record: false, remote: true },
          );
      },
      () => navigate("/together"),
    );
    const stopShelf = watchShelf(workspace.id, setShelf);
    const stopPresence = watchPresence(workspace.id, setPresence);
    return () => {
      window.removeEventListener("pagehide", batcher.flush);
      batcher.stop();
      batchRef.current = null;
      store.getState().bind(null);
      stopItems();
      stopShelf();
      stopPresence();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per workspace
  }, [workspace.id]);

  // the paper may be changed by someone else
  useEffect(() => {
    const cur = store.getState().page;
    if (JSON.stringify(cur) !== JSON.stringify(workspace.page))
      store
        .getState()
        .apply([{ k: "page", page: workspace.page }], { record: false, remote: true });
  }, [workspace.page, store]);

  // "I'm here": a heartbeat while the page is open
  useEffect(() => {
    const color =
      COLORS[Math.abs([...me].reduce((a, c) => a + c.charCodeAt(0), 0)) % COLORS.length]!;
    const name = profile?.nickname ?? "";
    const beat = () =>
      void heartbeat(workspace.id, me, name || "?", color).catch(() => {});
    beat();
    const timer = setInterval(beat, 20_000);
    return () => {
      clearInterval(timer);
      void leavePresence(workspace.id, me);
    };
  }, [workspace.id, me, profile?.nickname]);

  const shelfMap = useMemo(() => new Map(shelf.map((s) => [s.id, s])), [shelf]);
  const resolve: StickerResolver = useMemo(
    () => (ref) => {
      const e = ref.startsWith("a:") ? shelfMap.get(ref.slice(2)) : undefined;
      return e && e.kind === "sticker"
        ? { url: e.url, w: e.w, h: e.h, name: e.name }
        : null;
    },
    [shelfMap],
  );

  const keepCopy = async () => {
    setCopying(true);
    try {
      const thumb = await exportRef.current?.thumb().catch(() => null);
      const id = await saveCopy(
        me,
        latest.current,
        store.getState().items,
        shelfMap,
        journals.length,
        thumb,
      );
      toast.push({
        kind: "success",
        title: t("together.copySaved"),
        action: {
          label: t("together.openCopy"),
          onClick: () => navigate(`/journals/${id}`),
        },
      });
    } catch (err) {
      console.error("Saving a copy failed", err);
      toast.push({
        kind: "error",
        title: t("auth.errors.toastTitle"),
        body: `${t("together.copyFailed")} (${(err as { code?: string }).code ?? (err as Error).name ?? "error"})`,
      });
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="zf-page zf-page--wide">
      <JournalStudio
        title={title}
        onTitle={(next) => {
          setTitle(next);
        }}
        resolve={resolve}
        backTo={{ to: "/together", label: t("together.backToTogether") }}
        exportRef={exportRef}
        stickerPicker={(p) => (
          <ShelfStickerPicker
            {...p}
            shelf={shelf}
            names={names}
            onBringIn={() => setBringOpen(true)}
          />
        )}
        tapePicker={(p) => (
          <ShelfTapePicker {...p} shelf={shelf} onBringIn={() => setBringOpen(true)} />
        )}
        header={
          <>
            <Button
              variant="primary"
              size="sm"
              icon="check"
              seed="wsave"
              loading={saving}
              onClick={() => void saveNow()}
            >
              {unsaved ? t("common.save") : t("journal.savedShort")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon="copy"
              seed="wcopy"
              loading={copying}
              onClick={() => void keepCopy()}
            >
              {t("together.saveCopy")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon="download"
              seed="wdl"
              onClick={() =>
                void exportRef.current
                  ?.png()
                  .then((b) =>
                    downloadBlob(
                      b,
                      `${(title.trim() || "journal").replace(/[^\p{L}\p{N}]+/gu, "-")}.png`,
                    ),
                  )
              }
            >
              {t("journal.download")}
            </Button>
          </>
        }
        aside={
          <div style={{ display: "grid", gap: 10, width: "100%" }}>
            <p style={{ margin: 0, fontSize: 13, color: "var(--ink-muted)" }}>
              {savedAt
                ? t("together.savedAt", {
                    time: new Intl.DateTimeFormat(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(savedAt),
                  })
                : t("together.saveHint")}
            </p>
            <Button
              variant="secondary"
              size="sm"
              icon="plus"
              seed="wbring"
              onClick={() => setBringOpen(true)}
            >
              {t("together.addFromLibrary")}
            </Button>
            <MembersPanel workspace={workspace} presence={presence} me={me} />
          </div>
        }
      />
      <RenameOnBlur workspaceId={workspace.id} title={title} saved={workspace.title} />
      <BringInDialog
        open={bringOpen}
        onClose={() => setBringOpen(false)}
        workspaceId={workspace.id}
        me={me}
      />
    </div>
  );
}

/** The title is kept in step a moment after typing stops. */
function RenameOnBlur({
  workspaceId,
  title,
  saved,
}: {
  workspaceId: string;
  title: string;
  saved: string;
}) {
  useEffect(() => {
    const next = title.trim();
    if (!next || next === saved) return;
    const timer = setTimeout(
      () => void renameWorkspace(workspaceId, next).catch(() => {}),
      900,
    );
    return () => clearTimeout(timer);
  }, [title, saved, workspaceId]);
  return null;
}
