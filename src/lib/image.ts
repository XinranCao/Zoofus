import { useEffect, useState } from "react";

/** Re-encode an image file as JPEG at the given quality (0..1). */
export function compressImage(file: File, quality = 0.2): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas is not supported"));
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(new File([blob], file.name, { type: "image/jpeg" }))
            : reject(new Error("Compression failed")),
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

/** Load an image element from a URL; returns null until loaded (or if it fails). */
export function useLoadedImage(src: string | null, crossOrigin?: "anonymous") {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const img = new window.Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => {
      if (!cancelled) setImage(img);
    };
    img.onerror = () => {
      if (!cancelled) setImage(null);
    };
    img.src = src;
    return () => {
      cancelled = true;
      setImage(null);
    };
  }, [src, crossOrigin]);
  return image;
}

/** Largest size that fits inside maxW x maxH while keeping the aspect ratio. */
export function getFitSize(nw: number, nh: number, maxW: number, maxH: number) {
  const ratio = Math.min(maxW / nw, maxH / nh);
  return { width: Math.round(nw * ratio), height: Math.round(nh * ratio) };
}

/** Scale a flat [x1, y1, x2, y2, ...] point list between two coordinate spaces. */
export function scalePoints(
  points: number[],
  fromWidth: number,
  fromHeight: number,
  toWidth: number,
  toHeight: number,
): number[] {
  const xScale = toWidth / fromWidth;
  const yScale = toHeight / fromHeight;
  const scaled: number[] = [];
  for (let i = 0; i < points.length; i += 2) {
    scaled.push(points[i]! * xScale, points[i + 1]! * yScale);
  }
  return scaled;
}

/** Longest side, in px, that photos are downscaled to before editing (keeps memory in check). */
export const MAX_EDITOR_SIDE = 2048;
/** Largest source file we accept. */
export const MAX_SOURCE_BYTES = 30 * 1024 * 1024;

/** Shrink to fit `maxSide` on the longest side, keeping the aspect ratio. Never upscales. */
export function limitSize(width: number, height: number, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/png",
  quality?: number,
) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode image"))),
      type,
      quality,
    ),
  );
}

export class UnsupportedImageError extends Error {}

/**
 * Decode a user-picked photo (honouring EXIF rotation), downscale it, and return an object URL.
 * The caller owns the URL and must revoke it.
 */
export async function prepareImage(
  file: File,
  maxSide = MAX_EDITOR_SIDE,
): Promise<string> {
  if (!file.type.startsWith("image/"))
    throw new UnsupportedImageError("That file is not an image.");
  if (file.size > MAX_SOURCE_BYTES)
    throw new UnsupportedImageError("That image is larger than 30 MB.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new UnsupportedImageError(
      "Your browser can't open that image format. Try a JPEG or PNG.",
    );
  }
  try {
    const { width, height } = limitSize(bitmap.width, bitmap.height, maxSide);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not supported");
    ctx.drawImage(bitmap, 0, 0, width, height);
    // Keep transparency for formats that can have it; photos become high-quality JPEG.
    const hasAlpha = /png|webp|gif/.test(file.type);
    const blob = await canvasToBlob(canvas, hasAlpha ? "image/png" : "image/jpeg", 0.92);
    return URL.createObjectURL(blob);
  } finally {
    bitmap.close();
  }
}

/** A PNG thumbnail of a canvas, `maxSide` px on the longest side (transparency kept). */
export function makeThumbnail(source: HTMLCanvasElement, maxSide = 256): Promise<Blob> {
  const { width, height } = limitSize(source.width, source.height, maxSide);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas is not supported"));
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  return canvasToBlob(canvas);
}
