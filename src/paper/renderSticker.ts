import {
  dieCut,
  dieCutPad,
  edgeWidth,
  type CanvasSource,
  type EdgeShape,
} from "./dieCut";
import { hex, patternSVG, type PatternSpec } from "./pattern";

/** What a user chooses for a sticker's edge. Saved with the sticker so "Edit edge" can redo it. */
export interface EdgeSpec {
  shape: EdgeShape;
  /** 0-1.6 × the automatic width. */
  scale: number;
  fill: PatternSpec;
}

export const DEFAULT_EDGE: EdgeSpec = {
  shape: "wobbly",
  scale: 1,
  fill: { kind: "solid", bg: "sheet-50" },
};

/** Pattern repeats are defined against a 300px sticker and scale with the actual size. */
const PATTERN_REFERENCE = 300;

/** Decode an image URL (including data: SVG) to an element ready for drawImage. */
export function loadImage(
  src: string,
  crossOrigin?: "anonymous",
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

/**
 * Cut a sticker from a transparent, edge-less cut-out already at the wanted pixel size.
 * Used for the live preview (display size × devicePixelRatio) AND the exported file (source
 * size): the same call, so the screen and the PNG match apart from resolution.
 */
export async function renderSticker(
  source: CanvasSource,
  edge: EdgeSpec,
  seed: string,
): Promise<HTMLCanvasElement> {
  const long = Math.max(source.width, source.height);
  const border = edgeWidth(long, edge.scale);
  const pad = dieCutPad(border);
  let fill: HTMLImageElement | null = null;
  if (border > 0 && edge.fill.kind !== "solid") {
    const svg = patternSVG(
      edge.fill,
      source.width + pad * 2,
      source.height + pad * 2,
      long / PATTERN_REFERENCE,
    );
    fill = await loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
  }
  return dieCut(source, {
    shape: edge.shape,
    border,
    color: edge.fill.kind === "solid" ? colourOf(edge.fill) : undefined,
    fill,
    // the torn lip is the paper's pale core: kraft on a white edge, white otherwise
    fiber: edge.fill.bg === "sheet-50" ? "#e8ddd0" : "#fbf6ee",
    seed,
  }) as HTMLCanvasElement;
}

const colourOf = (spec: PatternSpec) => hex(spec.bg);
