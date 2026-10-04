import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/useAuth";
import { deleteTape, listTapes, renameTape, saveTape } from "./tape.api";
import type { TapeSpec } from "./tape.schema";

const key = (uid: string) => ["tapes", uid] as const;

export function useTapes() {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  return useQuery({
    queryKey: key(uid ?? ""),
    queryFn: () => listTapes(uid!),
    enabled: Boolean(uid),
  });
}

export function useSaveTape() {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tape: TapeSpec) => {
      if (!uid) throw new Error("Not signed in");
      return saveTape(uid, tape);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(uid ?? "") }),
  });
}

export function useDeleteTape() {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (!uid) throw new Error("Not signed in");
      return deleteTape(uid, id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(uid ?? "") }),
  });
}

export function useRenameTape() {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => {
      if (!uid) throw new Error("Not signed in");
      return renameTape(uid, id, name);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(uid ?? "") }),
  });
}
