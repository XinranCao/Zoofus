import { useMemo } from "react";
import { useStickers } from "@/features/stickers/library/useStickers";
import type { Asset } from "./journal.schema";
import type { StickerInfo, StickerResolver } from "./JournalCanvas";

/**
 * Where a `ref` on a journal page finds its picture: a plain id is one of your stickers (looked up
 * live, so editing a sticker's edge shows on every page); `a:<id>` is a picture kept in the
 * journal itself (it came from a friend or a shared workspace).
 */
export function useStickerResolver(assets?: Record<string, Asset>): StickerResolver {
  const { data } = useStickers();
  return useMemo(() => {
    const own = new Map<string, StickerInfo>();
    for (const s of data ?? [])
      own.set(s.id, { url: s.imageUrl, w: s.width, h: s.height, name: s.name });
    return (ref: string) => {
      if (ref.startsWith("a:")) {
        const a = assets?.[ref.slice(2)];
        return a ? { url: a.url, w: a.w, h: a.h, name: a.name } : null;
      }
      return own.get(ref) ?? null;
    };
  }, [data, assets]);
}
