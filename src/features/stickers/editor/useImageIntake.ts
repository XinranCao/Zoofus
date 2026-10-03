import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { prepareImage, UnsupportedImageError } from "@/lib/image";
import { useEditor } from "./store/editorStore";

/** Turns a picked or dropped file into the editor's photo, tracking loading and errors. */
export function useImageIntake() {
  const { t } = useTranslation();
  const setImage = useEditor((s) => s.setImage);
  const setStatus = useEditor((s) => s.setImageStatus);

  return useCallback(
    async (file: File) => {
      setStatus("loading");
      try {
        setImage(await prepareImage(file));
      } catch (err) {
        const code = err instanceof UnsupportedImageError ? err.code : "generic";
        setStatus("error", t(`maker.errors.${code}`));
      }
    },
    [setImage, setStatus, t],
  );
}
