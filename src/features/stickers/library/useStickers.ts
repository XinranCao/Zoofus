import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/useAuth";
import { makeThumbnail } from "@/lib/image";
import {
  deleteSticker,
  listStickers,
  renameSticker,
  saveSticker,
  type NewSticker,
} from "./stickers.api";
import type { Sticker } from "./sticker.schema";

const keys = { all: (uid: string) => ["stickers", uid] as const };

function useUid() {
  const { currentUser } = useAuth();
  return currentUser?.uid;
}

export function useStickers() {
  const uid = useUid();
  return useQuery({
    queryKey: keys.all(uid ?? ""),
    queryFn: () => listStickers(uid!),
    enabled: Boolean(uid),
  });
}

export function useSaveSticker() {
  const uid = useUid();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      canvas,
      ...input
    }: Omit<NewSticker, "thumbnail"> & { canvas?: HTMLCanvasElement }) => {
      if (!uid) throw new Error("Not signed in");
      // Built inside the mutation so a failure surfaces as a normal save error.
      const thumbnail = canvas ? await makeThumbnail(canvas) : undefined;
      return saveSticker(uid, { ...input, thumbnail });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all(uid ?? "") }),
    // The UI shows a generic message; keep the real cause (e.g. HTTP 402 when the project is on
    // the free Spark plan, which Cloud Storage no longer supports) visible in the console.
    onError: (err) => console.error("Saving the sticker failed", err),
  });
}

export function useDeleteSticker() {
  const uid = useUid();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sticker: Pick<Sticker, "id" | "storagePath" | "thumbnailPath">) => {
      if (!uid) throw new Error("Not signed in");
      return deleteSticker(uid, sticker);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all(uid ?? "") }),
  });
}

export function useRenameSticker() {
  const uid = useUid();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => {
      if (!uid) throw new Error("Not signed in");
      return renameSticker(uid, id, name);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all(uid ?? "") }),
  });
}
