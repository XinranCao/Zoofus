import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/useAuth";
import { useProfile } from "@/features/profile/useProfile";
import {
  acceptRequest,
  cancelRequest,
  declineRequest,
  finishShare,
  markShareDone,
  ensurePublicProfile,
  listFriends,
  listIncoming,
  listInbox,
  listSent,
  listSentShares,
  markSaved,
  markSeen,
  removeFriend,
  sendRequest,
  setFriendNickname,
} from "./social.api";
import { saveSharedToMine, shareWith, unshare, type ShareSource } from "./share.api";
import type { Share } from "./social.schema";

const keys = {
  me: (uid: string) => ["public", uid] as const,
  friends: (uid: string) => ["friends", uid] as const,
  incoming: (uid: string) => ["requests", uid] as const,
  sent: (uid: string) => ["sentRequests", uid] as const,
  inbox: (uid: string) => ["inbox", uid] as const,
  shared: (uid: string) => ["sentShares", uid] as const,
};

const POLL = 60_000;

function useUid() {
  return useAuth().currentUser?.uid;
}

/** Keep my public profile (nickname, picture, friend code) in step with my profile. */
export function useMyPublicProfile() {
  const uid = useUid();
  const { data: profile } = useProfile(uid);
  const query = useQuery({
    queryKey: [
      ...keys.me(uid ?? ""),
      profile?.nickname,
      profile?.profilePictureUrl,
      profile?.avatarKind,
    ],
    queryFn: () =>
      ensurePublicProfile(uid!, {
        nickname: profile!.nickname,
        avatarUrl: profile!.profilePictureUrl,
        avatarKind: profile!.avatarKind,
      }),
    enabled: Boolean(uid && profile),
    staleTime: 5 * 60_000,
  });
  return query;
}

export function useFriends(enabled = true) {
  const uid = useUid();
  return useQuery({
    queryKey: keys.friends(uid ?? ""),
    queryFn: () => listFriends(uid!),
    enabled: Boolean(uid) && enabled,
    refetchInterval: POLL,
  });
}
export function useIncomingRequests() {
  const uid = useUid();
  return useQuery({
    queryKey: keys.incoming(uid ?? ""),
    queryFn: () => listIncoming(uid!),
    enabled: Boolean(uid),
    refetchInterval: POLL,
  });
}
export function useSentRequests() {
  const uid = useUid();
  return useQuery({
    queryKey: keys.sent(uid ?? ""),
    queryFn: () => listSent(uid!),
    enabled: Boolean(uid),
  });
}
export function useInbox() {
  const uid = useUid();
  return useQuery({
    queryKey: keys.inbox(uid ?? ""),
    queryFn: () => listInbox(uid!),
    enabled: Boolean(uid),
    refetchInterval: POLL,
  });
}
export function useSentShares() {
  const uid = useUid();
  return useQuery({
    queryKey: keys.shared(uid ?? ""),
    queryFn: () => listSentShares(uid!),
    enabled: Boolean(uid),
  });
}

/** How many things wait for me: friend requests and shares I have not looked at. */
export function usePending(): number {
  const { data: requests } = useIncomingRequests();
  const { data: inbox } = useInbox();
  return (requests?.length ?? 0) + (inbox?.filter((s) => !s.seen).length ?? 0);
}

function useAct<A, R>(
  fn: (uid: string, arg: A) => Promise<R>,
  invalidate: (uid: string) => readonly (readonly unknown[])[],
) {
  const uid = useUid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (arg: A) => {
      if (!uid) throw new Error("Not signed in");
      return fn(uid, arg);
    },
    // the lists reload in the background: the action itself is done, and must not wait on (or be
    // held up by) a slow refresh of a list
    onSuccess: () => {
      for (const k of invalidate(uid ?? ""))
        void qc.invalidateQueries({ queryKey: k as unknown[] });
    },
  });
}

export const useSendRequest = () =>
  useAct(
    (uid, to: string) => sendRequest(uid, to),
    (u) => [keys.sent(u), keys.friends(u), keys.incoming(u)],
  );
export const useAcceptRequest = () =>
  useAct(
    (uid, from: string) => acceptRequest(uid, from),
    (u) => [keys.incoming(u), keys.friends(u)],
  );
export const useDeclineRequest = () =>
  useAct(
    (uid, from: string) => declineRequest(uid, from),
    (u) => [keys.incoming(u)],
  );
export const useCancelRequest = () =>
  useAct(
    (uid, to: string) => cancelRequest(uid, to),
    (u) => [keys.sent(u)],
  );
export const useRemoveFriend = () =>
  useAct(
    (uid, friend: string) => removeFriend(uid, friend),
    (u) => [keys.friends(u)],
  );
export const useFriendNickname = () =>
  useAct(
    (uid, a: { friend: string; nickname: string }) =>
      setFriendNickname(uid, a.friend, a.nickname),
    (u) => [keys.friends(u)],
  );
export const useShare = () =>
  useAct(
    (uid, a: { friend: string; source: ShareSource; note?: string }) =>
      shareWith(uid, a.friend, a.source, a.note),
    (u) => [keys.shared(u)],
  );
export const useUnshare = () =>
  useAct(
    (uid, a: { friend: string; id: string; files: string[] }) =>
      unshare(uid, a.friend, a.id, a.files),
    (u) => [keys.shared(u)],
  );
export const useDismissShare = () =>
  useAct(
    (uid, share: { id: string; from: string }) => finishShare(uid, share),
    (u) => [keys.inbox(u)],
  );
export const useMarkSeen = () =>
  useAct(
    (uid, id: string) => markSeen(uid, id),
    (u) => [keys.inbox(u)],
  );

/** Shares being kept right now, so a double click cannot keep one twice. */
const keeping = new Set<string>();

/** Keep a friend's share: it becomes mine, once (and the lists that show it are refreshed). */
export function useSaveShared() {
  const uid = useUid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ share, journals }: { share: Share; journals: number }) => {
      if (!uid) throw new Error("Not signed in");
      if (share.saved || keeping.has(share.id)) return "";
      keeping.add(share.id);
      try {
        const id = await saveSharedToMine(uid, share, { journals });
        await markSaved(uid, share.id);
        void markShareDone(uid, share.from, share.id);
        return id;
      } finally {
        keeping.delete(share.id);
      }
    },
    onSuccess: (_id, { share }) => {
      const k =
        share.kind === "sticker"
          ? "stickers"
          : share.kind === "tape"
            ? "tapes"
            : "journals";
      void qc.invalidateQueries({ queryKey: keys.inbox(uid ?? "") });
      return qc.invalidateQueries({ queryKey: [k, uid ?? ""] });
    },
  });
}
