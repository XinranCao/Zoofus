import { hex } from "@/paper/pattern";
import { rng } from "@/paper/random";
import type { PageSpec } from "./journal.schema";

/**
 * The paper a journal is made on, drawn with the canvas: a notebook (ruled, squared, dotted,
 * crossed or blank), newsprint (columns of grey "text", a masthead rule, picture boxes) or a
 * magazine page (glossy or matte). Everything is seeded, so every device draws the same sheet, and
 * nothing is stored: a page only records the choice.
 */

const SEED = "zoofus-paper";

type RGB = [number, number, number];
const parse = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const css = ([r, g, b]: RGB, a = 1) =>
  `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const darker = (c: RGB, t: number): RGB => mix(c, [60, 50, 40], t);

/** Pixel size to draw a page at: sharp on screen, capped so a big page stays cheap. */
export function paperSize(page: PageSpec, maxSide = 1600) {
  const k = Math.min(1, maxSide / Math.max(page.width, page.height));
  return { width: Math.round(page.width * k), height: Math.round(page.height * k), k };
}

let grain: HTMLCanvasElement | null = null;
function grainTile(): HTMLCanvasElement {
  if (grain) return grain;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const R = rng(SEED + "grain");
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(80,60,40,${0.04 + R() * 0.08})`;
    g.fillRect(R() * 128, R() * 128, 1 + R(), 1 + R());
  }
  grain = c;
  return c;
}

export function drawPaper(page: PageSpec, maxSide = 1600): HTMLCanvasElement {
  const { width, height, k } = paperSize(page, maxSide);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const base = parse(hex(page.color));
  const u = (v: number) => v * k; // page units → pixels

  if (page.paper === "notebook") {
    ctx.fillStyle = css(base);
    ctx.fillRect(0, 0, width, height);
    drawRuling(ctx, page, base, width, height, u);
  } else if (page.paper === "newspaper") {
    // newsprint: the colour you chose, dulled toward grey-yellow
    const news = mix(base, [226, 219, 200], 0.55);
    ctx.fillStyle = css(news);
    ctx.fillRect(0, 0, width, height);
    drawNewsprint(ctx, page, news, width, height, u);
  } else {
    drawMagazine(ctx, page, base, width, height, u);
  }

  // a little paper grain over everything
  const pattern = ctx.createPattern(grainTile(), "repeat");
  if (pattern) {
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
  }
  return canvas;
}

function drawRuling(
  ctx: CanvasRenderingContext2D,
  page: PageSpec,
  base: RGB,
  w: number,
  h: number,
  u: (v: number) => number,
) {
  const line = css(darker(base, 0.32), 0.55);
  const step = u(36);
  ctx.lineWidth = Math.max(1, u(1.4));
  ctx.strokeStyle = line;
  ctx.fillStyle = line;
  if (page.pattern === "ruled") {
    for (let y = u(120); y < h - u(30); y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // the margin
    ctx.strokeStyle = css([196, 96, 90], 0.5);
    ctx.beginPath();
    ctx.moveTo(u(96), 0);
    ctx.lineTo(u(96), h);
    ctx.stroke();
  } else if (page.pattern === "grid") {
    for (let x = step; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = step; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  } else if (page.pattern === "dots") {
    const r = Math.max(1, u(1.9));
    for (let y = step; y < h; y += step)
      for (let x = step; x < w; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
  } else if (page.pattern === "cross") {
    const a = u(4.5);
    for (let y = step; y < h; y += step)
      for (let x = step; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x - a, y);
        ctx.lineTo(x + a, y);
        ctx.moveTo(x, y - a);
        ctx.lineTo(x, y + a);
        ctx.stroke();
      }
  }
}

function drawNewsprint(
  ctx: CanvasRenderingContext2D,
  page: PageSpec,
  news: RGB,
  w: number,
  h: number,
  u: (v: number) => number,
) {
  const ink = css(darker(news, 0.7), 0.5);
  const R = rng(SEED + "news" + page.width + "x" + page.height);
  const margin = u(48);
  // masthead: a heavy rule over a light one
  ctx.fillStyle = css(darker(news, 0.8), 0.7);
  ctx.fillRect(margin, margin, w - margin * 2, u(7));
  ctx.fillRect(margin, margin + u(14), w - margin * 2, u(2));
  ctx.fillRect(margin, margin + u(72), w - margin * 2, u(2));
  if (page.pattern === "plain") return;

  const cols = page.width >= 1000 ? 4 : page.width >= 700 ? 3 : 2;
  const gutter = u(22);
  const colW = (w - margin * 2 - gutter * (cols - 1)) / cols;
  const top = margin + u(96);
  for (let c = 0; c < cols; c++) {
    const x = margin + c * (colW + gutter);
    let y = top;
    // a headline, then lines of grey text, sometimes a picture box
    ctx.fillStyle = css(darker(news, 0.85), 0.65);
    const heads = 1 + Math.floor(R() * 2);
    for (let hd = 0; hd < heads; hd++) {
      ctx.fillRect(x, y, colW * (0.7 + R() * 0.3), u(15));
      y += u(26);
      if (R() > 0.5) {
        ctx.fillRect(x, y - u(8), colW * (0.35 + R() * 0.4), u(15));
        y += u(18);
      }
      const lines = 6 + Math.floor(R() * 8);
      ctx.fillStyle = ink;
      for (let l = 0; l < lines && y < h - margin; l++) {
        const len = l === lines - 1 ? colW * (0.2 + R() * 0.5) : colW;
        ctx.fillRect(x, y, len, u(3.4));
        y += u(10);
      }
      y += u(14);
      if (R() > 0.55 && y < h - margin - u(120)) {
        const bh = u(70 + R() * 70);
        ctx.fillStyle = css(darker(news, 0.5), 0.35);
        ctx.fillRect(x, y, colW, bh);
        ctx.strokeStyle = css(darker(news, 0.8), 0.5);
        ctx.lineWidth = Math.max(1, u(1));
        ctx.strokeRect(x, y, colW, bh);
        y += bh + u(14);
      }
      ctx.fillStyle = css(darker(news, 0.85), 0.65);
    }
    for (; y < h - margin; y += u(10)) {
      ctx.fillStyle = ink;
      ctx.fillRect(x, y, colW * (R() > 0.92 ? 0.4 : 1), u(3.4));
    }
    // the column rule
    if (c < cols - 1) {
      ctx.fillStyle = css(darker(news, 0.6), 0.35);
      ctx.fillRect(x + colW + gutter / 2, top, u(1), h - top - margin);
    }
  }
}

function drawMagazine(
  ctx: CanvasRenderingContext2D,
  page: PageSpec,
  base: RGB,
  w: number,
  h: number,
  u: (v: number) => number,
) {
  ctx.fillStyle = css(base);
  ctx.fillRect(0, 0, w, h);
  // coated paper is a touch lighter than the ink it is printed in
  ctx.fillStyle = css([255, 255, 255], 0.16);
  ctx.fillRect(0, 0, w, h);
  if (page.pattern === "gloss") {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, css([255, 255, 255], 0.34));
    g.addColorStop(0.35, css([255, 255, 255], 0));
    g.addColorStop(0.62, css([255, 255, 255], 0.2));
    g.addColorStop(1, css([255, 255, 255], 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // a fine halftone screen
    ctx.fillStyle = css(darker(base, 0.5), 0.07);
    const step = u(9);
    for (let y = step / 2; y < h; y += step)
      for (let x = ((y / step) % 2 ? step / 2 : 0) + step / 2; x < w; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.6, u(1.2)), 0, Math.PI * 2);
        ctx.fill();
      }
  } else {
    // matte: even, with a faint fibre
    const R = rng(SEED + "matte");
    ctx.strokeStyle = css(darker(base, 0.4), 0.05);
    ctx.lineWidth = 1;
    for (let i = 0; i < 260; i++) {
      const x = R() * w;
      const y = R() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (R() - 0.5) * u(40), y + (R() - 0.5) * u(40));
      ctx.stroke();
    }
  }
}
