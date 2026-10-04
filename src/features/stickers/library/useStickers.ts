import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/useAuth";
import { COMPRESSION, encodeWithin } from "@/lib/image";
import type { EdgeSpec } from "@/paper/renderSticker";
import { cutRect, decodeOutline } from "../editor/domain/outline";
import {
  deleteSticker,
  listStickers,
  renameSticker,
  saveSticker,
  updateStickerEdge,
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

/**
 * Whatever the original photo size, what we store is compressed to the policy in COMPRESSION
 * (max 1280 px, WebP, transparency kept), so storage stays cheap but the sticker stays sharp.
 */
async function compress(canvas: HTMLCanvasElement) {
  return encodeWithin(canvas, COMPRESSION.sticker);
}

export interface SaveStickerInput {
  name: string;
  /** The finished sticker (edge baked in), as a canvas. */
  sticker: HTMLCanvasElement;
  /** The lasso outline as text (see `domain/outline.ts`): what "Edit edge" rebuilds the cut-out from. */
  outline: string;
  edge: EdgeSpec;
  seed: string;
}

export function useSaveSticker() {
  const uid = useUid();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, sticker, outline, edge, seed }: SaveStickerInput) => {
      if (!uid) throw new Error("Not signed in");
      const baked = await compress(sticker);
      const o = decodeOutline(outline);
      return saveSticker(uid, {
        name,
        sticker: baked.blob,
        ...(o
          ? {
              outline,
              cut: cutRect(
                sticker.width,
                sticker.height,
                o.width,
                o.height,
                baked.width,
                baked.height,
              ),
            }
          : {}),
        width: baked.width,
        height: baked.height,
        edge,
        seed,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all(uid ?? "") }),
    // The UI shows a translated message; keep the real cause (e.g. HTTP 402 on the free plan) in the console.
    onError: (err) => console.error("Saving the sticker failed", err),
  });
}

export function useUpdateStickerEdge() {
  const uid = useUid();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sticker,
      canvas,
      edge,
      seed,
      cutSize,
    }: {
      sticker: Pick<Sticker, "id" | "storagePath">;
      canvas: HTMLCanvasElement;
      edge: EdgeSpec;
      seed: string;
      /** The cut-out's size in px, for stickers that keep an outline (their cut-out has moved). */
      cutSize?: { w: number; h: number };
    }) => {
      if (!uid) throw new Error("Not signed in");
      const baked = await compress(canvas);
      return updateStickerEdge(uid, sticker, {
        sticker: baked.blob,
        width: baked.width,
        height: baked.height,
        edge,
        seed,
        ...(cutSize
          ? {
              cut: cutRect(
                canvas.width,
                canvas.height,
                cutSize.w,
                cutSize.h,
                baked.width,
                baked.height,
              ),
            }
          : {}),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all(uid ?? "") }),
    onError: (err) => console.error("Updating the sticker edge failed", err),
  });
}

export function useDeleteSticker() {
  const uid = useUid();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      sticker: Pick<Sticker, "id" | "storagePath" | "sourcePath" | "thumbnailPath">,
    ) => {
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
