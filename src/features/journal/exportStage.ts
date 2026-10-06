import type Konva from "konva";
import { canvasToBlob } from "@/lib/image";

/**
 * A journal page as a picture, drawn from the stage's own layers into a separate canvas, so the
 * live page is never touched (the handles live in a layer of their own, which is left out).
 */
export async function exportStage(
  st: Konva.Stage,
  pageWidth: number,
  maxSide: number,
  quality: number,
  mime: string,
): Promise<Blob> {
  const k = st.scaleX();
  const ratio = Math.min(2, maxSide / (pageWidth * k) || 1);
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(st.width() * ratio));
  out.height = Math.max(1, Math.round(st.height() * ratio));
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported");
  for (const layer of st.getLayers()) {
    if (layer.findOne("Transformer")) continue;
    ctx.drawImage(
      layer.toCanvas({
        x: 0,
        y: 0,
        width: st.width(),
        height: st.height(),
        pixelRatio: ratio,
      }),
      0,
      0,
      out.width,
      out.height,
    );
  }
  return canvasToBlob(out, mime, quality);
}
