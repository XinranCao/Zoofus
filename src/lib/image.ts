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
