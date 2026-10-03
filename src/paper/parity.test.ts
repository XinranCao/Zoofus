// @vitest-environment node
import { createCanvas, loadImage, type Canvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { EDGE_SHAPES } from "./dieCut";
import type { PatternSpec } from "./pattern";
import { renderSticker, type EdgeSpec } from "./renderSticker";
import type { CanvasSource } from "./dieCut";

/**
 * Screen = file: a sticker rendered at a 300px long side and the same sticker rendered at 1200px
 * and scaled down must look the same (edge width, edge noise and pattern all scale with L).
 */
const io = {
  createCanvas: (w: number, h: number) =>
    createCanvas(w, h) as unknown as HTMLCanvasElement,
  // napi-rs cannot load an SVG data: URL directly; hand it the decoded markup
  loadImage: (src: string) =>
    loadImage(
      Buffer.from(decodeURIComponent(src.slice(src.indexOf(",") + 1))),
    ) as unknown as Promise<CanvasImageSource>,
};

/** A fixed cut-out (a heart-ish blob) drawn at long side L, 4:3. */
function cutout(L: number): Canvas {
  const c = createCanvas(L, Math.round((L * 3) / 4));
  const g = c.getContext("2d");
  g.fillStyle = "#c0392b";
  g.beginPath();
  g.ellipse(
    c.width / 2,
    c.height / 2,
    c.width * 0.36,
    c.height * 0.34,
    0,
    0,
    Math.PI * 2,
  );
  g.fill();
  return c;
}

const STRIPES: PatternSpec = {
  kind: "stripes",
  bg: "sheet-50",
  ink: "brick-700",
  scale: 12,
  angle: 45,
  weight: 0.5,
} as PatternSpec;
const SOLID: PatternSpec = { kind: "solid", bg: "sheet-50" } as PatternSpec;

async function render(L: number, edge: EdgeSpec): Promise<Canvas> {
  return (await renderSticker(
    cutout(L) as unknown as CanvasSource,
    edge,
    "parity",
    io,
  )) as unknown as Canvas;
}

/** `c` scaled by `k`, centred on a w × h canvas (the two renders differ by a rounded padding). */
function normalised(c: Canvas, k: number, w: number, h: number): Uint8ClampedArray {
  const t = createCanvas(w, h);
  const g = t.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.drawImage(
    c,
    (w - c.width * k) / 2,
    (h - c.height * k) / 2,
    c.width * k,
    c.height * k,
  );
  return g.getImageData(0, 0, w, h).data as unknown as Uint8ClampedArray;
}

describe("render parity between resolutions", () => {
  for (const shape of EDGE_SHAPES) {
    for (const [name, fill] of [
      ["solid", SOLID],
      ["stripes", STRIPES],
    ] as const) {
      it(`${shape} edge, ${name} fill`, async () => {
        const edge: EdgeSpec = { shape, scale: 1, fill };
        const small = await render(300, edge);
        const big = await render(1200, edge);
        const a = normalised(small, 1, small.width, small.height);
        const b = normalised(big, 0.25, small.width, small.height);

        let diff = 0;
        let inter = 0;
        let union = 0;
        for (let i = 0; i < a.length; i += 4) {
          // channels are compared on premultiplied colour so transparent pixels do not count twice
          const aa = a[i + 3]! / 255;
          const ba = b[i + 3]! / 255;
          for (let k = 0; k < 3; k++)
            diff += Math.abs(a[i + k]! * aa - b[i + k]! * ba) / 255;
          diff += Math.abs(aa - ba);
          const ma = a[i + 3]! > 127;
          const mb = b[i + 3]! > 127;
          if (ma && mb) inter++;
          if (ma || mb) union++;
        }
        const mean = diff / ((a.length / 4) * 4);
        expect(mean).toBeLessThan(0.02);
        expect(inter / union).toBeGreaterThan(0.97);
      }, 120_000);
    }
  }
});
