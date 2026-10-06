import { safeDisplayUrl } from "@/lib/trustedUrl";
import {
  dieCut,
  dieCutPad,
  edgeWidth,
  PATTERN_REF,
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

/** Decode an image URL (including data: SVG) to an element ready for drawImage. */
export function loadImage(
  src: string,
  crossOrigin?: "anonymous",
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!safeDisplayUrl(src)) {
      reject(new Error("This picture comes from an address that is not allowed."));
      return;
    }
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

/** Canvas and image factories, replaceable so the same code can run outside a browser (tests). */
export interface RenderIO {
  createCanvas?: (w: number, h: number) => HTMLCanvasElement | OffscreenCanvas;
  loadImage?: (src: string) => Promise<CanvasImageSource>;
  /** Keep the grown edge for this `source` (see `DieCutOptions.cacheMasks`): the live preview. */
  cacheMasks?: boolean;
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
  io: RenderIO = {},
): Promise<HTMLCanvasElement> {
  const long = Math.max(source.width, source.height);
  const border = edgeWidth(long, edge.scale);
  const pad = dieCutPad(border);
  let fill: CanvasImageSource | null = null;
  if (border > 0 && edge.fill.kind !== "solid") {
    const svg = patternSVG(
      edge.fill,
      source.width + pad * 2,
      source.height + pad * 2,
      long / PATTERN_REF,
      // the print is anchored to the middle of the sticker, so the padding (which rounds
      // differently at each size) never shifts it: the repeat sits in the same place at any size
      [(source.width + pad * 2) / 2, (source.height + pad * 2) / 2],
    );
    fill = await (io.loadImage ?? loadImage)(
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg),
    );
  }
  return dieCut(source, {
    shape: edge.shape,
    border,
    color: edge.fill.kind === "solid" ? colourOf(edge.fill) : undefined,
    fill,
    // the torn lip is the paper's pale core: kraft on a white edge, white otherwise
    fiber: edge.fill.bg === "sheet-50" ? "#e8ddd0" : "#fbf6ee",
    seed,
    createCanvas: io.createCanvas,
    cacheMasks: io.cacheMasks,
  }) as HTMLCanvasElement;
}

const colourOf = (spec: PatternSpec) => hex(spec.bg);
