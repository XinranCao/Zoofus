import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/useAuth";
import { COMPRESSION, encodeWithin } from "@/lib/image";
import { deleteSticker, listStickers, renameSticker, saveSticker } from "./stickers.api";
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
    mutationFn: async ({ canvas, name }: { canvas: HTMLCanvasElement; name: string }) => {
      if (!uid) throw new Error("Not signed in");
      // Whatever the original photo size, what we store is compressed to the policy in
      // COMPRESSION (max 1280 px, WebP ~q82), so storage stays cheap but the sticker stays sharp.
      const sticker = await encodeWithin(canvas, COMPRESSION.sticker);
      return saveSticker(uid, {
        name,
        blob: sticker.blob,
        width: sticker.width,
        height: sticker.height,
      });
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
