import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/useAuth";
import { cleanForFirestore } from "@/paper/patternSchema";
import {
  countJournals,
  createJournal,
  deleteJournal,
  getJournal,
  listJournals,
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
      if (changes.items) change.items = cleanForFirestore(changes.items);
      if (saved.thumbUrl) {
        change.thumbUrl = saved.thumbUrl;
        change.thumbPath = saved.thumbPath;
      }
      qc.setQueryData<Journal[]>(key(uid ?? ""), (list) =>
        patchJournal(list, journal.id, change, true),
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
