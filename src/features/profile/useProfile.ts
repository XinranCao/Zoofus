import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  clearAvatar,
  fetchProfile,
  saveProfile,
  setStickerAvatar,
  updateNickname,
} from "./profile.api";
import type { Profile } from "./profile.schema";

export const profileKeys = {
  detail: (uid: string) => ["profile", uid] as const,
};

export function useProfile(uid: string | undefined) {
  return useQuery({
    queryKey: profileKeys.detail(uid ?? ""),
    queryFn: () => fetchProfile(uid!),
    enabled: Boolean(uid),
  });
}

export function useSaveProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.detail(profile.uid), profile);
    },
  });
}

/** Rename, change or remove the picture: each updates the cached profile. */
export function useProfileEdits(
  uid: string | undefined,
  profile: Profile | null | undefined,
) {
  const qc = useQueryClient();
  const key = profileKeys.detail(uid ?? "");
  const patch = (p: Partial<Profile>) =>
    qc.setQueryData<Profile | null | undefined>(key, (old) =>
      old ? { ...old, ...p } : old,
    );
  const rename = useMutation({
    mutationFn: (nickname: string) => updateNickname(uid!, nickname),
    onSuccess: (_d, nickname) => patch({ nickname }),
  });
  const setPicture = useMutation({
    mutationFn: (blob: Blob) => setStickerAvatar(uid!, blob, profile?.avatarPath),
    onSuccess: ({ url, path }) =>
      patch({ profilePictureUrl: url, avatarKind: "sticker", avatarPath: path }),
  });
  const removePicture = useMutation({
    mutationFn: () => clearAvatar(uid!, profile?.avatarPath),
    onSuccess: () =>
      patch({ profilePictureUrl: "", avatarKind: undefined, avatarPath: undefined }),
  });
  return { rename, setPicture, removePicture };
}
