import { getFitSize, useLoadedImage } from "@/lib/image";
import { useEditor } from "./store/editorStore";

export const STAGE_SIZE = 500;

/** The loaded image and the size it is drawn at inside the editor stage. */
export function useEditorImage() {
  const imageUrl = useEditor((s) => s.imageUrl);
  const image = useLoadedImage(imageUrl, "anonymous");
  const fit = image
    ? getFitSize(image.naturalWidth, image.naturalHeight, STAGE_SIZE, STAGE_SIZE)
    : { width: STAGE_SIZE, height: STAGE_SIZE };
  return { image, fit };
}
