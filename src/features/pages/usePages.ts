import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/useAuth";
import {
  createPage,
  deletePage,
  getPage,
  listPages,
  savePage,
  type PageChanges,
} from "./pages.api";

const keys = {
  all: (uid: string) => ["pages", uid] as const,
  one: (uid: string, id: string) => ["pages", uid, id] as const,
};

function useUid() {
  const { currentUser } = useAuth();
  return currentUser?.uid;
}

export function usePages() {
  const uid = useUid();
  return useQuery({
    queryKey: keys.all(uid ?? ""),
    queryFn: () => listPages(uid!),
    enabled: Boolean(uid),
  });
}

export function usePage(id: string | undefined) {
  const uid = useUid();
  return useQuery({
    queryKey: keys.one(uid ?? "", id ?? ""),
    queryFn: () => getPage(uid!, id!),
    enabled: Boolean(uid && id),
  });
}

function useInvalidatingMutation<TVars, TData>(
  run: (uid: string, vars: TVars) => Promise<TData>,
) {
  const uid = useUid();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: TVars) => {
      if (!uid) throw new Error("Not signed in");
      return run(uid, vars);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all(uid ?? "") }),
  });
}

export const useCreatePage = () =>
  useInvalidatingMutation((uid, title: string) => createPage(uid, title));

export const useSavePage = () =>
  useInvalidatingMutation((uid, v: { id: string; changes: PageChanges }) =>
    savePage(uid, v.id, v.changes),
  );

export const useDeletePage = () =>
  useInvalidatingMutation((uid, id: string) => deletePage(uid, id));
