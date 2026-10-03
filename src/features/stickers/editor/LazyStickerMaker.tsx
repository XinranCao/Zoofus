import { lazy, Suspense, type ComponentProps } from "react";

const load = () => import("./StickerMakerDialog");
const Maker = lazy(() => load().then((m) => ({ default: m.StickerMakerDialog })));

/** Start fetching the maker (Konva, polygon-clipping, the studios) before it is needed. */
export const preloadStickerMaker = () => void load();

/**
 * The sticker maker is the heaviest part of the app (the canvas library alone is about a third of
 * the code), and most visits never open it: it is fetched the first time it opens, or earlier on
 * hover, focus or touch of an upload button (`preloadStickerMaker`).
 */
export function StickerMakerDialog(props: ComponentProps<typeof Maker>) {
  if (!props.open) return null;
  return (
    <Suspense fallback={null}>
      <Maker {...props} />
    </Suspense>
  );
}
