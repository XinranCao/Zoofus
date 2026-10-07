import { useEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { dieCutPad, edgeWidth, forgetMasks } from "@/paper/dieCut";
import { seededRot } from "@/paper/random";
import {
  DEFAULT_EDGE,
  loadImage,
  renderSticker,
  type EdgeSpec,
} from "@/paper/renderSticker";
import { renderScale } from "@/lib/lite";
import { artUrl, type ArtName } from "./art";

/**
 * A die-cut sticker drawn by dieCut(): the user's cut-out with the chosen edge baked in, flat,
 * no shadow. The cut-out is a transparent, edge-less `source` canvas, a `src` URL, or demo `art`.
 * The canvas is rendered at display size × devicePixelRatio (≤ 2), at most once per animation
 * frame; the exported file comes from the same renderSticker() call.
 */
export function Sticker({
  source,
  src,
  art,
  size = 120,
  edge = DEFAULT_EDGE,
  seed,
  rotate = 4,
  label,
  interactive,
  crossOrigin,
}: {
  source?: HTMLCanvasElement | null;
  src?: string;
  art?: ArtName;
  size?: number;
  edge?: EdgeSpec;
  seed?: string;
  /** ± range of the seeded tilt; 0 for detail views. */
  rotate?: number;
  /** Alt text: the sticker's name. */
  label?: string;
  interactive?: boolean;
  crossOrigin?: "anonymous";
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const id = seed ?? art ?? src ?? "sticker";
  const edgeKey = JSON.stringify(edge);
  const url = src ?? (source ? null : artUrl(art ?? "pear"));

  // Only the newest request is ever drawn: while one picture is being made (a slow machine, a
  // slider being dragged), later requests replace each other instead of queueing up, so the work
  // never falls behind the hand and nothing is drawn for a value that is already out of date.
  const shown = useRef<{
    origin: CanvasImageSource;
    w: number;
    h: number;
    canvas: HTMLCanvasElement;
  } | null>(null);
  useEffect(
    () => () => {
      if (shown.current) {
        forgetMasks(shown.current.canvas);
        shown.current.canvas.width = 0;
        shown.current.canvas.height = 0;
        shown.current = null;
      }
    },
    [],
  );
  const job = useRef<{ busy: boolean; next: (() => Promise<void>) | null }>({
    busy: false,
    next: null,
  });
  useEffect(() => {
    let alive = true;
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = renderScale();
    const draw = async () => {
      if (!alive) return;
      const origin = source ?? (url ? await loadImage(url, crossOrigin) : null);
      if (!origin || !alive) return;
      const ow = "naturalWidth" in origin ? origin.naturalWidth || 100 : origin.width;
      const oh = "naturalHeight" in origin ? origin.naturalHeight || 100 : origin.height;
      // the cut-out at the pixel size it will be shown at; the edge is added around it
      const k = (size * dpr) / Math.max(ow, oh);
      const w = Math.max(1, Math.round(ow * k));
      const h = Math.max(1, Math.round(oh * k));
      // the cut-out at the shown size, kept while only the edge changes, so the grown edge shape
      // can be kept with it (a colour or print change then costs two draws, not thousands)
      let scaled = shown.current?.canvas;
      if (
        !shown.current ||
        shown.current.origin !== origin ||
        shown.current.w !== w ||
        shown.current.h !== h
      ) {
        if (shown.current) {
          forgetMasks(shown.current.canvas);
          shown.current.canvas.width = 0; // gives its memory back
          shown.current.canvas.height = 0;
        }
        scaled = document.createElement("canvas");
        scaled.width = w;
        scaled.height = h;
        const sctx = scaled.getContext("2d");
        if (!sctx) return;
        sctx.imageSmoothingQuality = "high";
        sctx.drawImage(origin, 0, 0, w, h);
        shown.current = { origin, w, h, canvas: scaled };
      }
      const out = await renderSticker(scaled!, JSON.parse(edgeKey) as EdgeSpec, id, {
        cacheMasks: true,
      });
      if (!alive) {
        out.width = 0;
        out.height = 0;
        return;
      }
      canvas.width = out.width;
      canvas.height = out.height;
      canvas.style.width = out.width / dpr + "px";
      // the height follows the width (never a fixed height): in a box narrower than the sticker it
      // shrinks with the width and keeps its shape
      canvas.style.height = "auto";
      canvas.style.aspectRatio = `${out.width} / ${out.height}`;
      canvas.getContext("2d")?.drawImage(out, 0, 0);
      out.width = 0; // (the shown copy is the only one kept)
      out.height = 0;
    };
    const run = async () => {
      const state = job.current;
      if (state.busy) {
        state.next = run; // replaces whatever was waiting
        return;
      }
      state.busy = true;
      try {
        await draw();
      } catch {
        /* a picture that cannot be drawn leaves the last one in place */
      }
      state.busy = false;
      const next = state.next;
      state.next = null;
      if (next) void next();
    };
    const raf = requestAnimationFrame(() => void run());
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [source, url, size, edgeKey, id, crossOrigin]);

  // Reserve the finished size before the first render, so nothing below it moves when it lands
  // (a bare canvas is 300 × 150): the cut-out's long side plus the edge's padding on both sides.
  const dpr = typeof window === "undefined" ? 1 : renderScale();
  const pad = dieCutPad(edgeWidth(size * dpr, edge.scale)) / dpr;
  const aspect = source && source.width > 0 ? source.height / source.width : 1;
  const reserveW = (aspect > 1 ? size / aspect : size) + pad * 2;
  const reserveH = (aspect > 1 ? size : size * aspect) + pad * 2;

  return (
    <span
      className={cn("zf-sticker", interactive && "is-interactive")}
      style={{ "--rot": rotate === 0 ? "0deg" : seededRot(id, rotate) } as CSSProperties}
    >
      <canvas
        ref={ref}
        // a sticker with no name is decoration (a heading's art): nothing to announce
        {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
        // the shape is kept by the ratio: if the box is narrower than the sticker (a phone), the
        // height follows the width instead of staying put, so a round sticker is never an oval
        style={{
          width: reserveW,
          height: "auto",
          aspectRatio: `${reserveW} / ${reserveH}`,
        }}
      />
    </span>
  );
}
