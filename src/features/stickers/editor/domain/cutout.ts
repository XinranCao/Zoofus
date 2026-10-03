import type { MultiPolygon } from "polygon-clipping";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The smallest box around every ring of a mask, or null when it is empty. */
export function maskBounds(mask: MultiPolygon): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const poly of mask) {
    for (const ring of poly) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!Number.isFinite(minX)) return null;
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

/** Longest side, in px, of the stored/exported cut-out. Matches COMPRESSION.sticker.maxSide. */
export const CUTOUT_MAX_SIDE = 1280;

/**
 * Draw the image clipped to the mask, cropped to the mask's bounding box and scaled down to
 * `maxSide`. The result is a transparent, edge-less cut-out: the input of `dieCut`.
 */
export function renderCutoutSource(
  image: HTMLImageElement,
  mask: MultiPolygon,
  maxSide = CUTOUT_MAX_SIDE,
): HTMLCanvasElement | null {
  const box = maskBounds(mask);
  if (!box) return null;
  const k = Math.min(1, maxSide / Math.max(box.width, box.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(box.width * k));
  canvas.height = Math.max(1, Math.round(box.height * k));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported");
  ctx.imageSmoothingQuality = "high";
  ctx.scale(k, k);
  ctx.translate(-box.x, -box.y);
  ctx.beginPath();
  for (const poly of mask) {
    for (const ring of poly) {
      if (ring.length < 3) continue;
      ctx.moveTo(ring[0]![0], ring[0]![1]);
      for (let i = 1; i < ring.length; i++) ctx.lineTo(ring[i]![0], ring[i]![1]);
      ctx.closePath();
    }
  }
  ctx.clip();
  ctx.drawImage(image, 0, 0);
  return canvas;
}
