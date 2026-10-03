import { useEffect, useRef } from "react";
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
 * no shadow. `src` is a transparent, edge-less cut-out (or `art` for demo art). The canvas is
 * rendered at display size × devicePixelRatio (≤ 2); the exported file comes from the same call.
 */
export function Sticker({
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
  const url = src ?? artUrl(art ?? "pear");

  useEffect(() => {
    let alive = true;
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    (async () => {
      const img = await loadImage(url, crossOrigin);
      // the cut-out at the pixel size it will be shown at; the edge is added around it
      const natural = Math.max(img.naturalWidth || 100, img.naturalHeight || 100);
      const long = size * dpr;
      const k = long / natural;
      const w = Math.max(1, Math.round((img.naturalWidth || 100) * k));
      const h = Math.max(1, Math.round((img.naturalHeight || 100) * k));
      const source = document.createElement("canvas");
      source.width = w;
      source.height = h;
      source.getContext("2d")?.drawImage(img, 0, 0, w, h);
      const out = await renderSticker(source, JSON.parse(edgeKey) as EdgeSpec, id);
      if (!alive) return;
      canvas.width = out.width;
      canvas.height = out.height;
      canvas.style.width = out.width / dpr + "px";
      canvas.style.height = out.height / dpr + "px";
      canvas.getContext("2d")?.drawImage(out, 0, 0);
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [url, size, edgeKey, id, crossOrigin]);

  return (
    <span
      className={cn("zf-sticker", interactive && "is-interactive")}
      style={
        { "--rot": rotate === 0 ? "0deg" : seededRot(id, rotate) } as React.CSSProperties
      }
    >
      <canvas ref={ref} role="img" aria-label={label ?? "Sticker"} />
    </span>
  );
}
