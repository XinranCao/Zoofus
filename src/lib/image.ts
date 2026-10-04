import { useEffect, useState } from "react";

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
    let objectUrl: string | null = null;
    img.onerror = () => {
      // A live bucket can refuse a cross-origin load of a file the browser already cached from a
      // plain <img>; read it with the Storage SDK and draw from the bytes instead (once).
      if (
        cancelled ||
        !crossOrigin ||
        img.src.startsWith("blob:") ||
        !/^https?:/.test(src)
      ) {
        if (!cancelled) setImage(null);
        return;
      }
      void import("./storage")
        .then((m) => m.readPicture(src))
        .then((blob) => {
          if (cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          img.src = objectUrl;
        })
        .catch(() => !cancelled && setImage(null));
    };
    img.src = src;
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
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

export type ImageErrorCode = "notImage" | "tooLarge" | "undecodable";

/** A photo we cannot use. `code` lets the UI show a translated message. */
export class UnsupportedImageError extends Error {
  code: ImageErrorCode;
  constructor(message: string, code: ImageErrorCode) {
    super(message);
    this.code = code;
  }
}

/** Decode a user-picked photo (honouring EXIF rotation) onto a canvas of at most `maxSide` px. */
async function decodeToCanvas(file: File, maxSide: number): Promise<HTMLCanvasElement> {
  if (!file.type.startsWith("image/"))
    throw new UnsupportedImageError("That file is not an image.", "notImage");
  if (file.size > MAX_SOURCE_BYTES)
    throw new UnsupportedImageError("That image is larger than 30 MB.", "tooLarge");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new UnsupportedImageError(
      "Your browser can't open that image format. Try a JPEG or PNG.",
      "undecodable",
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
    return canvas;
  } finally {
    bitmap.close();
  }
}

/**
 * Decode a user-picked photo for editing and return an object URL. The photo is downscaled to
 * keep memory in check; photos become high-quality JPEG, formats that can have transparency
 * stay PNG. The caller owns the URL and must revoke it.
 */
export async function prepareImage(
  file: File,
  maxSide = MAX_EDITOR_SIDE,
): Promise<string> {
  const canvas = await decodeToCanvas(file, maxSide);
  const hasAlpha = /png|webp|gif/.test(file.type);
  const blob = await canvasToBlob(canvas, hasAlpha ? "image/png" : "image/jpeg", 0.92);
  return URL.createObjectURL(blob);
}

/**
 * Storage compression policy. Web-photo norms are a long side of ~1,600 px at quality 75-85;
 * stickers are shown small on collage pages, so 1,280 px still covers 2x screens. WebP keeps
 * transparency at a fraction of PNG's size (typically 5-10x smaller).
 */
export interface CompressOptions {
  format: "webp" | "jpeg";
  /** Longest side in px. */
  maxSide: number;
  /** Starting quality, 0..1. */
  quality: number;
  /** Quality is never lowered below this. */
  minQuality: number;
  /** Dimensions are never reduced below this (longest side, px). */
  minSide: number;
  /** Target size; the encoder steps quality, then size, down until it fits. */
  maxBytes: number;
}

export const COMPRESSION = {
  sticker: {
    format: "webp",
    maxSide: 1280,
    quality: 0.82,
    minQuality: 0.6,
    minSide: 480,
    maxBytes: 400 * 1024,
  },
  /** A sticker-shaped profile picture: transparent, tiny. */
  stickerAvatar: {
    format: "webp",
    maxSide: 256,
    quality: 0.85,
    minQuality: 0.6,
    minSide: 96,
    maxBytes: 60 * 1024,
  },
  avatar: {
    format: "jpeg",
    maxSide: 512,
    quality: 0.85,
    minQuality: 0.6,
    minSide: 256,
    maxBytes: 150 * 1024,
  },
} satisfies Record<string, CompressOptions>;

export interface Encoded {
  blob: Blob;
  width: number;
  height: number;
}

type Encoder = (
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
) => Promise<Blob>;

function resize(
  source: HTMLCanvasElement,
  width: number,
  height: number,
  background?: string,
) {
  if (!background && width === source.width && height === source.height) return source;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported");
  if (background) {
    ctx.fillStyle = background; // JPEG has no alpha: flatten transparency onto a colour
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

/**
 * Scale `source` to `maxSide` and encode it, stepping quality down by 0.1 (never below
 * `minQuality`) and then the dimensions down by 15% (never below `minSide`) until it fits
 * `maxBytes`. If the browser cannot encode the format (for example WebP on older Safari) it
 * returns PNG, which has no quality setting, so only the dimensions are reduced.
 */
export async function encodeWithin(
  source: HTMLCanvasElement,
  options: CompressOptions,
  encode: Encoder = canvasToBlob,
): Promise<Encoded> {
  const mime = options.format === "webp" ? "image/webp" : "image/jpeg";
  const background = options.format === "jpeg" ? "#ffffff" : undefined;
  let { width, height } = limitSize(source.width, source.height, options.maxSide);
  let quality = options.quality;
  let result: Encoded | null = null;

  for (let attempt = 0; attempt < 20; attempt++) {
    const blob = await encode(resize(source, width, height, background), mime, quality);
    result = { blob, width, height };
    if (blob.size <= options.maxBytes) return result;

    const canLowerQuality = blob.type === mime && quality - options.minQuality > 1e-6;
    if (canLowerQuality) {
      quality = Math.max(options.minQuality, Math.round((quality - 0.1) * 100) / 100);
    } else if (Math.max(width, height) > options.minSide) {
      const next = limitSize(
        width,
        height,
        Math.max(options.minSide, Math.floor(Math.max(width, height) * 0.85)),
      );
      width = next.width;
      height = next.height;
    } else {
      break; // at the floors: return the smallest we can make
    }
  }
  return result!;
}

/** Compress a profile photo for upload: EXIF-rotated, max 512 px, JPEG. */
export async function prepareAvatar(file: File): Promise<File> {
  const canvas = await decodeToCanvas(file, COMPRESSION.avatar.maxSide);
  const { blob } = await encodeWithin(canvas, COMPRESSION.avatar);
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
    type: "image/jpeg",
  });
}
