import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reel } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/Toast";
import { downloadBlob } from "@/features/stickers/studio/export";
import { AUTOSAVE_MS } from "./autosave";
import { JournalStudio, type JournalExport } from "./JournalStudio";
import type { Journal } from "./journal.schema";
import {
  JournalStoreProvider,
  useJournalState,
  useJournalStore,
} from "./store/journalStore";
import { SaveStatus } from "./SaveStatus";
import { useStickerResolver } from "./stickerRegistry";
import { useAuth } from "@/features/auth/useAuth";
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

const readDraft = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeDraft = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* the draft is a convenience */
  }
};

function Editor({ journal }: { journal: Journal }) {
  const { t } = useTranslation();
  const toast = useToast();
  const store = useJournalStore();
  const save = useSaveJournal();
  const resolve = useStickerResolver(journal.assets);
  const dirty = useJournalState((s) => s.dirty);
  // The title being typed, and the one the server has. A draft of the title is kept in the browser
  // as it is typed, so a reload a moment later still shows it (and saves it).
  const uid = useAuth().currentUser?.uid ?? "";
  const draftKey = `zf-journal-title-${uid}-${journal.id}`;
  const [savedTitle, setSavedTitle] = useState(journal.title);
  const [title, setTitle] = useState(() => {
    const draft = readDraft(draftKey);
    return draft && draft !== journal.title ? draft : journal.title;
  });
  const titleDirty = title.trim() !== savedTitle && title.trim() !== "";
  const titleRef = useRef(title);
  const savedTitleRef = useRef(savedTitle);
  const exportRef = useRef<JournalExport>(null);
  const thumbPath = useRef(journal.thumbPath);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    store.getState().load(journal.page, journal.items);
  }, [store, journal]);

  const changeTitle = (next: string) => {
    titleRef.current = next;
    writeDraft(draftKey, next);
    setTitle(next);
  };

  const persist = async (withThumb: boolean) => {
    const { page, items } = store.getState();
    const sendTitle = titleRef.current.trim() || savedTitleRef.current;
    const thumb = withThumb ? await exportRef.current?.thumb().catch(() => null) : null;
    const result = await save.mutateAsync({
      journal: { id: journal.id, thumbPath: thumbPath.current },
      changes: { title: sendTitle, page, items, thumb },
    });
    if (result) thumbPath.current = result;
    savedTitleRef.current = sendTitle;
    setSavedTitle(sendTitle);
    if (titleRef.current.trim() === sendTitle) writeDraft(draftKey, null);
    // an edit made while this was being saved is still unsaved
    const now = store.getState();
    if (now.page === page && now.items === items) now.markSaved();
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

  const unsavedTitle = () =>
    titleRef.current.trim() !== "" && titleRef.current.trim() !== savedTitleRef.current;

  // Autosave at most once a minute while there are changes (the timer is not pushed back by every
  // edit, so a long session is still kept), and when leaving (items, and a title typed just before).
  const latest = useRef({ persist });
  useEffect(() => {
    latest.current = { persist };
  });
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = store.subscribe((s, prev) => {
      if (!s.dirty || (s.items === prev.items && s.page === prev.page)) return;
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        void latest.current.persist(true).catch(() => {});
      }, AUTOSAVE_MS);
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
      if (store.getState().dirty) void latest.current.persist(true).catch(() => {});
      else if (unsavedTitle()) void latest.current.persist(false).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs only
  }, [store]);

  // a new title is kept a moment after typing stops
  useEffect(() => {
    if (!titleDirty) return;
    const timer = setTimeout(
      () => void latest.current.persist(false).catch(() => {}),
      1000,
    );
    return () => clearTimeout(timer);
  }, [title, titleDirty]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (store.getState().dirty || unsavedTitle()) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs only
  }, [store]);

  return (
    <div className="zf-page zf-page--wide">
      <JournalStudio
        title={title}
        onTitle={changeTitle}
        resolve={resolve}
        backTo={{ to: "/journals", label: t("journal.backToJournals") }}
        exportRef={exportRef}
        header={
          <>
            <SaveStatus
              state={
                save.isPending ? "saving" : dirty || titleDirty ? "pending" : "saved"
              }
            />
            <Button
              variant="quiet"
              size="sm"
              icon="check"
              seed="jsave"
              loading={save.isPending}
              onClick={() => void saveNow()}
            >
              {t("common.save")}
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
