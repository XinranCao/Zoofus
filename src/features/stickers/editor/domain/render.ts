import type { MultiPolygon } from "polygon-clipping";
import type { Border, Size } from "./types";

function tracePolygons(
  ctx: CanvasRenderingContext2D,
  mask: MultiPolygon,
  inset?: Size & { half: number },
) {
  ctx.beginPath();
  for (const poly of mask) {
    for (const ring of poly) {
      if (ring.length < 3) continue;
      const pts = inset
        ? ring.map(([x, y]) => [
            Math.max(inset.half, Math.min(inset.width - inset.half, x)),
            Math.max(inset.half, Math.min(inset.height - inset.half, y)),
          ])
        : ring;
      ctx.moveTo(pts[0]![0]!, pts[0]![1]!);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0]!, pts[i]![1]!);
      ctx.closePath();
    }
  }
}

/** Draw the image clipped to the mask, plus a border; returns a transparent canvas. */
export function renderCutout(
  image: HTMLImageElement,
  mask: MultiPolygon,
  border: Border,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported");

  ctx.save();
  tracePolygons(ctx, mask);
  ctx.clip();
  ctx.drawImage(image, 0, 0);
  ctx.restore();

  if (border.width > 0) {
    ctx.save();
    // Pull border points inward so edges clipped by the image bounds still show a border.
    tracePolygons(ctx, mask, {
      width: canvas.width,
      height: canvas.height,
      half: border.width / 2,
    });
    ctx.strokeStyle = border.color;
    ctx.lineWidth = border.width;
    ctx.lineJoin = "miter";
    ctx.lineCap = "square";
    ctx.stroke();
    ctx.restore();
  }
  return canvas;
}
