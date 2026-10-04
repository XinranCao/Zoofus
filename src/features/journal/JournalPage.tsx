import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reel } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/Toast";
import { downloadBlob } from "@/features/stickers/studio/export";
import { JournalStudio, type JournalExport } from "./JournalStudio";
import type { Journal } from "./journal.schema";
import {
  JournalStoreProvider,
  useJournalState,
  useJournalStore,
} from "./store/journalStore";
import { useStickerResolver } from "./stickerRegistry";
import { useJournal, useSaveJournal } from "./useJournals";

/** `/journals/:id`: open one of your journals in the studio. */
export default function JournalPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { data: journal, isPending } = useJournal(id);
  if (isPending)
    return (
      <div
        className="zf-page"
        style={{ display: "grid", placeItems: "center", minHeight: 320 }}
      >
        <Reel label={t("journal.opening")} />
      </div>
    );
  if (!journal)
    return (
      <div className="zf-page">
        <EmptyState
          seed="journal-missing"
          title={t("journal.missingTitle")}
          action={
            <Button variant="primary" seed="jm-back" onClick={() => history.back()}>
              {t("common.back")}
            </Button>
          }
        >
          {t("journal.missingBody")}
        </EmptyState>
      </div>
    );
  return (
    <JournalStoreProvider>
      <Editor journal={journal} />
    </JournalStoreProvider>
  );
}

const AUTOSAVE_MS = 4000;

function Editor({ journal }: { journal: Journal }) {
  const { t } = useTranslation();
  const toast = useToast();
  const store = useJournalStore();
  const save = useSaveJournal();
  const resolve = useStickerResolver(journal.assets);
  const dirty = useJournalState((s) => s.dirty);
  const [title, setTitle] = useState(journal.title);
  const titleDirty = title.trim() !== journal.title && title.trim() !== "";
  const exportRef = useRef<JournalExport>(null);
  const thumbPath = useRef(journal.thumbPath);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    store.getState().load(journal.page, journal.items);
  }, [store, journal]);

  const persist = async (withThumb: boolean) => {
    const { page, items } = store.getState();
    const thumb = withThumb ? await exportRef.current?.thumb().catch(() => null) : null;
    const result = await save.mutateAsync({
      journal: { id: journal.id, thumbPath: thumbPath.current },
      changes: { title: title.trim() || journal.title, page, items, thumb },
    });
    if (result) thumbPath.current = result;
    store.getState().markSaved();
  };

  const saveNow = async () => {
    try {
      await persist(true);
      toast.push({ kind: "success", title: t("journal.saved") });
    } catch (err) {
      console.error("Saving the journal failed", err);
      toast.push({
        kind: "error",
        title: t("auth.errors.toastTitle"),
        body: t("journal.saveFailed"),
      });
    }
  };

  // Autosave a few seconds after the last change (without a new picture), and when leaving.
  const latest = useRef({ persist });
  useEffect(() => {
    latest.current = { persist };
  });
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = store.subscribe((s, prev) => {
      if (!s.dirty || (s.items === prev.items && s.page === prev.page)) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(
        () => void latest.current.persist(true).catch(() => {}),
        AUTOSAVE_MS,
      );
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
      if (store.getState().dirty) void latest.current.persist(true).catch(() => {});
    };
  }, [store]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (store.getState().dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [store]);

  return (
    <div className="zf-page zf-page--wide">
      <JournalStudio
        title={title}
        onTitle={setTitle}
        resolve={resolve}
        backTo={{ to: "/journals", label: t("journal.backToJournals") }}
        exportRef={exportRef}
        header={
          <>
            <Button
              variant="primary"
              size="sm"
              icon="check"
              seed="jsave"
              disabled={!dirty && !titleDirty}
              loading={save.isPending}
              onClick={() => void saveNow()}
            >
              {dirty || titleDirty ? t("common.save") : t("journal.savedShort")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon="download"
              seed="jdlpng"
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
      />
    </div>
  );
}
