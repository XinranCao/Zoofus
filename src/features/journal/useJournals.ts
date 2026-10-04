import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/useAuth";
import {
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

const key = (uid: string) => ["journals", uid] as const;
const one = (uid: string, id: string) => ["journal", uid, id] as const;

const useUid = () => useAuth().currentUser?.uid;

export function useJournals() {
  const uid = useUid();
  return useQuery({
    queryKey: key(uid ?? ""),
    queryFn: () => listJournals(uid!),
    enabled: Boolean(uid),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: key(uid ?? "") }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: key(uid ?? "") }),
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
