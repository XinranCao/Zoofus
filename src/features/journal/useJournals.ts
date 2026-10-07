import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useAuth } from "@/features/auth/useAuth";
import { cleanForFirestore } from "@/paper/patternSchema";
import {
  countJournals,
  listRecentJournals,
  createJournal,
  deleteJournal,
  getJournal,
  listJournalPage,
  listJournals,
  loadItems,
  slimJournal,
  type JournalPageResult,
  renameJournal,
  saveJournal,
  type JournalChanges,
  type NewJournal,
} from "./journal.api";
import type { Journal } from "./journal.schema";

/**
 * Puts what a save or a heal changed into the cached list, so nothing is read again (re-reading
 * every journal with all its items on each save is what this replaces). The list stays in the
 * server's order: most recently updated first.
 */
export function patchJournal(
  list: Journal[] | undefined,
  id: string,
  change: Partial<Journal>,
  moveToFront: boolean,
): Journal[] | undefined {
  if (!list) return list;
  const at = list.findIndex((j) => j.id === id);
  if (at === -1) return list;
  const next = { ...list[at]!, ...change };
  const rest = list.filter((_, i) => i !== at);
  return moveToFront ? [next, ...rest] : list.map((j, i) => (i === at ? next : j));
}

/** The same patch for the pages the Journals screen has loaded. */
export function patchJournalPages(
  data: InfiniteData<JournalPageResult> | undefined,
  id: string,
  change: Partial<Journal>,
): InfiniteData<JournalPageResult> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((p) => ({
      ...p,
      journals: p.journals.map((j) => (j.id === id ? { ...j, ...change } : j)),
    })),
  };
}

const key = (uid: string) => ["journals", uid] as const;
const one = (uid: string, id: string) => ["journal", uid, id] as const;

const useUid = () => useAuth().currentUser?.uid;

/**
 * Every journal with its items. Heavy, so only the screens that show journals read it. With
 * `{ read: false }` a component only watches what some other screen has already loaded.
 */
export function useJournals({ read = true }: { read?: boolean } = {}) {
  const uid = useUid();
  return useQuery({
    queryKey: key(uid ?? ""),
    queryFn: () => listJournals(uid!),
    enabled: Boolean(uid) && read,
  });
}

/** The Journals screen: 30 at a time, newest first (a light document each). */
export function useJournalPages({ read = true }: { read?: boolean } = {}) {
  const uid = useUid();
  return useInfiniteQuery({
    // under the list's key, so a create, a rename or a delete refreshes it too
    queryKey: [...key(uid ?? ""), "pages"],
    queryFn: ({ pageParam }) => listJournalPage(uid!, pageParam),
    initialPageParam: null as JournalPageResult["cursor"],
    getNextPageParam: (last) => last.cursor,
    enabled: Boolean(uid) && read,
  });
}

/**
 * The journals some screen has already loaded (the whole list, or the pages of the Journals
 * screen), without reading anything. For what heals or slims them in the background.
 */
export function useLoadedJournals(): Journal[] | undefined {
  const all = useJournals({ read: false }).data;
  const paged = useJournalPages({ read: false }).data;
  return useMemo(() => {
    if (!all && !paged) return undefined;
    const byId = new Map<string, Journal>();
    for (const j of all ?? []) byId.set(j.id, j);
    for (const p of paged?.pages ?? []) for (const j of p.journals) byId.set(j.id, j);
    return [...byId.values()];
  }, [all, paged]);
}

/**
 * What is on a journal's page. Older journals carry their items; the rest are read from their own
 * document, once (a save puts the new items here, so a tile never reads them again).
 */
export function useJournalItems(journal: Journal, enabled = true) {
  const uid = useUid();
  return useQuery({
    queryKey: ["journalItems", uid ?? "", journal.id],
    queryFn: () => loadItems(uid!, journal),
    enabled: Boolean(uid) && enabled && journal.slim,
    staleTime: 5 * 60_000,
  });
}

/**
 * Older journals keep their items inside the journal, so every list carries them. This moves them
 * out one journal at a time, out of sight (the "updated" time is kept), so a list becomes about a
 * kilobyte per journal. A journal being edited is left alone.
 */
export function useSlimming(list: Journal[] | undefined) {
  const uid = useUid();
  const qc = useQueryClient();
  const { pathname } = useLocation();
  const tried = useRef(new Set<string>());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!uid || !list || tried.current.size >= 20) return;
    const next = list.find(
      (j) => !j.slim && !tried.current.has(j.id) && !pathname.includes(j.id),
    );
    if (!next) return;
    // after the screen has settled, so it never competes with what the person is doing
    const timer = setTimeout(() => {
      tried.current.add(next.id);
      void slimJournal(uid, next.id)
        .then((items) => {
          if (!items) return;
          qc.setQueryData(["journalItems", uid, next.id], items);
          const change: Partial<Journal> = { slim: true, items: [] };
          qc.setQueryData<Journal[]>(key(uid), (l) =>
            patchJournal(l, next.id, change, false),
          );
          qc.setQueriesData<InfiniteData<JournalPageResult>>(
            { queryKey: [...key(uid), "pages"] },
            (d) => patchJournalPages(d, next.id, change),
          );
        })
        .catch((err) => console.warn("Could not slim a journal", err))
        .finally(() => setTick((n) => n + 1));
    }, 2000);
    return () => clearTimeout(timer);
  }, [uid, list, pathname, qc, tick]);
}

/** The newest few journals, for the home page (not the whole list). */
export function useRecentJournals(count: number) {
  const uid = useUid();
  return useQuery({
    // under the list's key, so a save, a create or a delete refreshes it too
    queryKey: [...key(uid ?? ""), "recent", count],
    queryFn: () => listRecentJournals(uid!, count),
    enabled: Boolean(uid),
  });
}

/** How many journals there are, without reading them (for numbering a new one and the limit). */
export function useJournalCount(enabled: boolean) {
  const uid = useUid();
  return useQuery({
    queryKey: ["journalCount", uid ?? ""],
    queryFn: () => countJournals(uid!),
    enabled: Boolean(uid) && enabled,
    // a journal made or deleted since is counted again the next time the dialog opens
    staleTime: 0,
  });
}

export function useJournal(id: string | undefined) {
  const uid = useUid();
  return useQuery({
    queryKey: one(uid ?? "", id ?? ""),
    queryFn: () => getJournal(uid!, id!),
    enabled: Boolean(uid && id),
    // the studio holds the live copy; do not refetch underneath it
    staleTime: Infinity,
    gcTime: 0,
  });
}

export function useCreateJournal() {
  const uid = useUid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ existing, ...input }: NewJournal & { existing: number }) => {
      if (!uid) throw new Error("Not signed in");
      return createJournal(uid, input, existing);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["journalCount", uid ?? ""] });
      return qc.invalidateQueries({ queryKey: key(uid ?? "") });
    },
  });
}

export function useSaveJournal() {
  const uid = useUid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      journal,
      changes,
    }: {
      journal: Pick<Journal, "id" | "thumbPath">;
      changes: JournalChanges;
    }) => {
      if (!uid) throw new Error("Not signed in");
      return saveJournal(uid, journal, changes);
    },
    onSuccess: (saved, { journal, changes }) => {
      const change: Partial<Journal> = { updatedAt: new Date() };
      if (changes.title !== undefined) change.title = changes.title;
      // as stored: no `undefined` fields (the next share writes these items out again)
      if (changes.page) change.page = cleanForFirestore(changes.page);
      if (changes.items) {
        // the list does not carry items any more: the page's own document does
        const items = cleanForFirestore(changes.items);
        change.itemCount = items.length;
        change.items = [];
        change.slim = true;
        qc.setQueryData(["journalItems", uid ?? "", journal.id], items);
      }
      if (saved.thumbUrl) {
        change.thumbUrl = saved.thumbUrl;
        change.thumbPath = saved.thumbPath;
      }
      qc.setQueryData<Journal[]>(key(uid ?? ""), (list) =>
        patchJournal(list, journal.id, change, true),
      );
      qc.setQueriesData<InfiniteData<JournalPageResult>>(
        { queryKey: [...key(uid ?? ""), "pages"] },
        (d) => patchJournalPages(d, journal.id, change),
      );
    },
  });
}

export function useRenameJournal() {
  const uid = useUid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => {
      if (!uid) throw new Error("Not signed in");
      return renameJournal(uid, id, title);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(uid ?? "") }),
  });
}

export function useDeleteJournal() {
  const uid = useUid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (!uid) throw new Error("Not signed in");
      return deleteJournal(uid, id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(uid ?? "") }),
  });
}
