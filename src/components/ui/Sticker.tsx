import { useEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { seededRot } from "@/paper/random";
import {
  DEFAULT_EDGE,
  loadImage,
  renderSticker,
  type EdgeSpec,
} from "@/paper/renderSticker";
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

  useEffect(() => {
    let alive = true;
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const raf = requestAnimationFrame(() => {
      void (async () => {
        const origin = source ?? (url ? await loadImage(url, crossOrigin) : null);
        if (!origin || !alive) return;
        const ow = "naturalWidth" in origin ? origin.naturalWidth || 100 : origin.width;
        const oh =
          "naturalHeight" in origin ? origin.naturalHeight || 100 : origin.height;
        // the cut-out at the pixel size it will be shown at; the edge is added around it
        const k = (size * dpr) / Math.max(ow, oh);
        const w = Math.max(1, Math.round(ow * k));
        const h = Math.max(1, Math.round(oh * k));
        const scaled = document.createElement("canvas");
        scaled.width = w;
        scaled.height = h;
        const sctx = scaled.getContext("2d");
        if (!sctx) return;
        sctx.imageSmoothingQuality = "high";
        sctx.drawImage(origin, 0, 0, w, h);
        const out = await renderSticker(scaled, JSON.parse(edgeKey) as EdgeSpec, id);
        if (!alive) return;
        canvas.width = out.width;
        canvas.height = out.height;
        canvas.style.width = out.width / dpr + "px";
        canvas.style.height = out.height / dpr + "px";
        canvas.getContext("2d")?.drawImage(out, 0, 0);
      })().catch(() => {});
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [source, url, size, edgeKey, id, crossOrigin]);

  return (
    <span
      className={cn("zf-sticker", interactive && "is-interactive")}
      style={{ "--rot": rotate === 0 ? "0deg" : seededRot(id, rotate) } as CSSProperties}
    >
      <canvas ref={ref} role="img" aria-label={label ?? "Sticker"} />
    </span>
  );
}
