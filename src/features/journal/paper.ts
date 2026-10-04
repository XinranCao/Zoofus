import { hex } from "@/paper/pattern";
import { rng } from "@/paper/random";
import type { PageSpec } from "./journal.schema";

/**
 * The paper a journal is made on, drawn with the canvas: a notebook (ruled, squared, dotted,
 * crossed or blank), newsprint (plain or aged) or a magazine page (glossy or matte). The last two
 * are textures only: no columns, headlines or boxes. Everything is seeded, so every device draws the same sheet, and
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
    // newsprint: the colour you chose, dulled toward grey (or, aged, toward yellow-brown)
    const news = mix(
      base,
      page.pattern === "aged" ? [222, 196, 144] : [226, 219, 200],
      0.6,
    );
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

/**
 * Newsprint is a texture, not a layout: a dulled sheet with fibres, soft mottling and darker edges.
 * "Aged" is the same paper gone yellow and brown, with a few foxing spots.
 */
function drawNewsprint(
  ctx: CanvasRenderingContext2D,
  page: PageSpec,
  news: RGB,
  w: number,
  h: number,
  u: (v: number) => number,
) {
  const aged = page.pattern === "aged";
  const R = rng(SEED + "news" + page.width + "x" + page.height + page.pattern);
  // soft mottling: big faint blotches, lighter and darker
  const blotches = aged ? 46 : 30;
  for (let i = 0; i < blotches; i++) {
    const x = R() * w;
    const y = R() * h;
    const r = u(80 + R() * 220);
    const dark = R() > 0.45;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const tone: RGB = dark ? (aged ? [150, 110, 60] : [120, 112, 98]) : [255, 252, 240];
    g.addColorStop(0, css(tone, dark ? (aged ? 0.13 : 0.07) : 0.12));
    g.addColorStop(1, css(tone, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // paper fibres
  ctx.lineWidth = Math.max(0.6, u(0.8));
  const fibres = Math.round((w * h) / (aged ? 1800 : 2600));
  for (let i = 0; i < fibres; i++) {
    const x = R() * w;
    const y = R() * h;
    const len = u(3 + R() * 9);
    const a = R() * Math.PI;
    ctx.strokeStyle =
      R() > 0.5 ? css(darker(news, 0.45), 0.1 + R() * 0.12) : css([255, 255, 250], 0.2);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  // darker, uneven edges
  const edge = Math.max(w, h) * (aged ? 0.5 : 0.62);
  const v = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.3,
    w / 2,
    h / 2,
    edge,
  );
  v.addColorStop(0, css([90, 70, 40], 0));
  v.addColorStop(1, css([90, 70, 40], aged ? 0.3 : 0.16));
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  if (aged) {
    // a few foxing spots
    for (let i = 0; i < 26; i++) {
      const x = R() * w;
      const y = R() * h;
      const r = u(1.5 + R() * 5);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, css([140, 90, 40], 0.3));
      g.addColorStop(1, css([140, 90, 40], 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
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
