import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/useAuth";
import {
  addToCollection,
  createCollection,
  deleteCollection,
  listCollections,
  removeFromAllCollections,
  removeFromCollection,
  renameCollection,
} from "./collections.api";
import type { CollectionItem } from "./collection.schema";

const key = (uid: string) => ["collections", uid] as const;

function useUid() {
  return useAuth().currentUser?.uid;
}

export function useCollections() {
  const uid = useUid();
  return useQuery({
    queryKey: key(uid ?? ""),
    queryFn: () => listCollections(uid!),
    enabled: Boolean(uid),
  });
}

function useInvalidating<A, R>(fn: (uid: string, arg: A) => Promise<R>) {
  const uid = useUid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (arg: A) => {
      if (!uid) throw new Error("Not signed in");
      return fn(uid, arg);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(uid ?? "") }),
  });
}

export const useCreateCollection = () =>
  useInvalidating(
    (uid, a: { name: string; items?: CollectionItem[]; existing: number }) =>
      createCollection(uid, a.name, a.items, a.existing),
  );
export const useRenameCollection = () =>
  useInvalidating((uid, a: { id: string; name: string }) =>
    renameCollection(uid, a.id, a.name),
  );
export const useDeleteCollection = () =>
  useInvalidating((uid, id: string) => deleteCollection(uid, id));
export const useAddToCollection = () =>
  useInvalidating((uid, a: { id: string; items: CollectionItem[] }) =>
    addToCollection(uid, a.id, a.items),
  );
export const useRemoveFromCollection = () =>
  useInvalidating((uid, a: { id: string; items: CollectionItem[] }) =>
    removeFromCollection(uid, a.id, a.items),
  );

/** Called after a delete: the things leave every collection. */
export function useForgetItems() {
  const uid = useUid();
  const qc = useQueryClient();
  return async (items: CollectionItem[]) => {
    if (!uid) return;
    await Promise.allSettled(items.map((i) => removeFromAllCollections(uid, i)));
    await qc.invalidateQueries({ queryKey: key(uid) });
  };
}
