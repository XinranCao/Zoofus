import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/useAuth";
import { getPublicProfile } from "@/features/social/social.api";
import {
  acceptInvite,
  createWorkspace,
  declineInvite,
  deleteWorkspace,
  inviteFriends,
  leaveWorkspace,
  listWorkspaces,
} from "./workspace.api";
import type { PageSpec } from "@/features/journal/journal.schema";

const key = (uid: string) => ["workspaces", uid] as const;
const useUid = () => useAuth().currentUser?.uid;

export function useWorkspaces() {
  const uid = useUid();
  return useQuery({
    queryKey: key(uid ?? ""),
    queryFn: () => listWorkspaces(uid!),
    enabled: Boolean(uid),
    // a safety net: a listener on the workspaces refreshes the list when one changes
    refetchInterval: 5 * 60_000,
  });
}

/** How many invitations to a shared journal are waiting for me. */
export function useInviteCount(): number {
  const { data } = useWorkspaces();
  return data?.invites.length ?? 0;
}

function useAct<A, R>(fn: (uid: string, arg: A) => Promise<R>) {
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

export const useCreateWorkspace = () =>
  useAct((uid, a: { title: string; page: PageSpec; invite: string[] }) =>
    createWorkspace(uid, a),
  );
export const useAcceptInvite = () => useAct((uid, id: string) => acceptInvite(uid, id));
export const useDeclineInvite = () => useAct((uid, id: string) => declineInvite(uid, id));
export const useLeaveWorkspace = () =>
  useAct((uid, id: string) => leaveWorkspace(uid, id));
export const useDeleteWorkspace = () =>
  useAct((uid, id: string) => deleteWorkspace(uid, id));
export const useInviteFriends = () =>
  useAct((_uid, a: { id: string; uids: string[] }) => inviteFriends(a.id, a.uids));

/** Public names and pictures for some people (members of a shared page, who may not be friends). */
export function usePublicProfiles(uids: string[]) {
  const results = useQueries({
    queries: uids.map((uid) => ({
      queryKey: ["public-profile", uid],
      queryFn: () => getPublicProfile(uid),
      staleTime: 5 * 60_000,
    })),
  });
  return new Map(uids.map((uid, i) => [uid, results[i]?.data ?? null]));
}
