import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProfile, saveProfile } from "./profile.api";

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
