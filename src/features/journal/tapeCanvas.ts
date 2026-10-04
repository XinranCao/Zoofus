import { useEffect, useState } from "react";
import { clipPolygon } from "@/paper/clip";
import { patternSVG, type PatternSpec } from "@/paper/pattern";
import { loadImage } from "@/paper/renderSticker";
import { tapeEnds, type TapeEnds } from "@/paper/tapeShape";

const SCALE = 2; // drawn at twice the page size, so it stays sharp when zoomed

const cache = new Map<string, HTMLCanvasElement>();

/** A strip of tape as a canvas: its print, cut to its ends. Cached by what defines it. */
export async function tapeCanvas(
  pattern: PatternSpec,
  length: number,
  thickness: number,
  ends: TapeEnds,
  seed: string,
): Promise<HTMLCanvasElement> {
  const key = JSON.stringify([
    pattern,
    Math.round(length),
    Math.round(thickness),
    ends,
    seed,
  ]);
  const hit = cache.get(key);
  if (hit) return hit;
  const w = Math.max(2, Math.round(length * SCALE));
  const h = Math.max(2, Math.round(thickness * SCALE));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const svg = patternSVG(pattern, w, h, SCALE);
  const img = await loadImage(
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg),
  );
  // the ends are defined in page units; scale them up to the canvas
  const shape = clipPolygon(tapeEnds(seed, ends, length, thickness), length, thickness);
  if (shape) {
    ctx.beginPath();
    shape.forEach(([x, y], i) =>
      i === 0 ? ctx.moveTo(x * SCALE, y * SCALE) : ctx.lineTo(x * SCALE, y * SCALE),
    );
    ctx.closePath();
    ctx.clip();
  }
  ctx.drawImage(img, 0, 0, w, h);
  if (cache.size > 200) cache.clear();
  cache.set(key, canvas);
  return canvas;
}

/** The canvas for a tape, or null while it is being drawn. */
export function useTapeCanvas(
  pattern: PatternSpec,
  length: number,
  thickness: number,
  ends: TapeEnds,
  seed: string,
) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const key = JSON.stringify([
    pattern,
    Math.round(length),
    Math.round(thickness),
    ends,
    seed,
  ]);
  useEffect(() => {
    let alive = true;
    tapeCanvas(pattern, length, thickness, ends, seed)
      .then((c) => alive && setCanvas(c))
      .catch(() => alive && setCanvas(null));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures the inputs
  }, [key]);
  return canvas;
}
