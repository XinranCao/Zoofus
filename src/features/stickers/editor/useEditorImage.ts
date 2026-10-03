import { useMemo } from "react";
import { getFitSize, useLoadedImage } from "@/lib/image";
import { useEditor } from "./store/editorStore";

export const STAGE_SIZE = 500;

/** The loaded image and the size it is drawn at inside the editor stage. */
export function useEditorImage() {
  const imageUrl = useEditor((s) => s.imageUrl);
  const image = useLoadedImage(imageUrl, "anonymous");
  // Memoized: consumers use `fit` as a dependency, so its identity must be stable.
  const fit = useMemo(
    () =>
      image
        ? getFitSize(image.naturalWidth, image.naturalHeight, STAGE_SIZE, STAGE_SIZE)
        : { width: STAGE_SIZE, height: STAGE_SIZE },
    [image],
  );
  return { image, fit };
}
