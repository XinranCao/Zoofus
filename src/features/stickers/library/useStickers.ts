import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { isLite } from "@/lib/lite";
import { loadImage } from "@/paper/renderSticker";
import { recentlyFailed, rememberFailure } from "@/features/journal/healMemory";
import { COMPRESSION, encodeWithin } from "@/lib/image";
import type { EdgeSpec } from "@/paper/renderSticker";
import { cutRect, decodeOutline } from "../editor/domain/outline";
import {
  deleteSticker,
  getSticker,
  listRecentStickers,
  listStickerPage,
  listStickers,
  renameSticker,
  saveSticker,
  setStickerThumb,
  updateStickerEdge,
} from "./stickers.api";
import type { Sticker } from "./sticker.schema";

// every key starts with `all`, so one invalidation after a save, delete or rename reaches them all
const keys = {
  all: (uid: string) => ["stickers", uid] as const,
  recent: (uid: string) => ["stickers", uid, "recent"] as const,
  pages: (uid: string) => ["stickers", uid, "pages"] as const,
  one: (uid: string, id: string) => ["stickers", uid, "one", id] as const,
};

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

/** The newest few stickers: what the home page shows, without reading the whole library. */
export function useRecentStickers(count = 12) {
  const uid = useUid();
  return useQuery({
    queryKey: [...keys.recent(uid ?? ""), count],
    queryFn: () => listRecentStickers(uid!, count),
    enabled: Boolean(uid),
  });
}

/** The Library, a page at a time (newest first). */
export function useStickerPages() {
  const uid = useUid();
  return useInfiniteQuery({
    queryKey: keys.pages(uid ?? ""),
    queryFn: ({ pageParam }) => listStickerPage(uid!, pageParam),
    initialPageParam: undefined as Parameters<typeof listStickerPage>[1],
    getNextPageParam: (last) => last.next,
    enabled: Boolean(uid),
  });
}

/** One sticker by id, for a link that may point past the pages loaded so far. */
export function useStickerById(id: string | null, enabled: boolean) {
  const uid = useUid();
  return useQuery({
    queryKey: keys.one(uid ?? "", id ?? ""),
    queryFn: () => getSticker(uid!, id!),
    enabled: Boolean(uid && id && enabled),
  });
}

/**
 * Whatever the original photo size, what we store is compressed to the policy in COMPRESSION
 * (max 1280 px, WebP, transparency kept), so storage stays cheap but the sticker stays sharp.
 */
async function compress(canvas: HTMLCanvasElement) {
  return encodeWithin(canvas, COMPRESSION.sticker);
}

/**
 * The small picture for tiles. Only WebP: where the browser cannot encode it (the full sticker
 * falls back to PNG there), the tile simply shows the full file.
 */
export async function makeThumb(canvas: HTMLCanvasElement): Promise<Blob | undefined> {
  try {
    const { blob } = await encodeWithin(canvas, COMPRESSION.stickerThumb);
    return blob.type === "image/webp" ? blob : undefined;
  } catch (err) {
    console.warn("Could not make a small picture for a sticker", err);
    return undefined;
  }
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
      const thumb = await makeThumb(sticker);
      const o = decodeOutline(outline);
      return saveSticker(uid, {
        name,
        sticker: baked.blob,
        ...(thumb ? { thumb } : {}),
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

/** Resolve once the picture has loaded (or failed, or 5 s have passed): never blocks for long. */
function preload(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    const done = () => resolve();
    img.onload = done;
    img.onerror = done;
    setTimeout(done, 5000);
    img.src = url;
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
      sticker: Pick<Sticker, "id" | "storagePath" | "thumbPath">;
      canvas: HTMLCanvasElement;
      edge: EdgeSpec;
      seed: string;
      /** The cut-out's size in px, for stickers that keep an outline (their cut-out has moved). */
      cutSize?: { w: number; h: number };
    }) => {
      if (!uid) throw new Error("Not signed in");
      const baked = await compress(canvas);
      const thumb = await makeThumb(canvas);
      return updateStickerEdge(uid, sticker, {
        sticker: baked.blob,
        ...(thumb ? { thumb } : {}),
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
    // "Edge saved." waits for the list and for the new picture, so the tile never shows the old edge
    onSuccess: async (imageUrl) => {
      await queryClient.invalidateQueries({ queryKey: keys.all(uid ?? "") });
      await preload(imageUrl);
    },
    onError: (err) => console.error("Updating the sticker edge failed", err),
  });
}

export function useDeleteSticker() {
  const uid = useUid();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      sticker: Pick<
        Sticker,
        "id" | "storagePath" | "sourcePath" | "thumbnailPath" | "thumbPath"
      >,
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

// ---------------------------------------------------------------- small pictures for old stickers

type Change = Partial<Sticker>;

/** Put a change into every cached shape of the sticker lists (a list, the pages, one sticker). */
function patchCaches(
  qc: ReturnType<typeof useQueryClient>,
  uid: string,
  id: string,
  change: Change,
) {
  const patchList = (l: Sticker[]) =>
    l.map((s) => (s.id === id ? { ...s, ...change } : s));
  qc.setQueriesData({ queryKey: keys.all(uid) }, (data: unknown) => {
    if (Array.isArray(data)) return patchList(data as Sticker[]);
    const d = data as { pages?: { stickers: Sticker[] }[] } | Sticker | null | undefined;
    if (d && "pages" in d && Array.isArray(d.pages))
      return {
        ...d,
        pages: d.pages.map((p) => ({ ...p, stickers: patchList(p.stickers) })),
      };
    if (d && "id" in d && d.id === id) return { ...d, ...change };
    return data;
  });
}

/** At most this many in one visit, one after the other (fewer on a slow computer). */
const perVisit = () => (isLite() ? 4 : 24);
const attempted = new Set<string>();

/**
 * A sticker saved before small pictures existed is shown from its full file. Once it is on
 * screen, this draws its small picture out of sight (idle, one at a time), keeps it, and the tile
 * switches to it. A sticker that cannot be drawn is remembered for a day and not tried again.
 */
export function useStickerThumbHealing(stickers: readonly Sticker[] | undefined) {
  const uid = useUid();
  const qc = useQueryClient();
  const [tick, setTick] = useState(0);
  const busy = useRef(false);

  useEffect(() => {
    if (!uid || !stickers || busy.current || attempted.size >= perVisit()) return;
    const next = stickers.find(
      (s) => !s.thumbUrl && !attempted.has(s.id) && !recentlyFailed(s.id),
    );
    if (!next) return;
    // after the page has settled, so it never competes with what the person is doing
    const timer = setTimeout(() => {
      attempted.add(next.id);
      busy.current = true;
      void (async () => {
        try {
          const img = await loadImage(next.imageUrl, "anonymous");
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext("2d")!.drawImage(img, 0, 0);
          const blob = await makeThumb(canvas);
          if (!blob) throw new Error("no small picture");
          const saved = await setStickerThumb(uid, next, blob);
          patchCaches(qc, uid, next.id, saved);
        } catch (err) {
          console.warn("Could not make a small picture for a sticker", err);
          rememberFailure(next.id);
        } finally {
          busy.current = false;
          setTick((n) => n + 1);
        }
      })();
    }, 1500);
    return () => clearTimeout(timer);
  }, [uid, stickers, qc, tick]);
}
