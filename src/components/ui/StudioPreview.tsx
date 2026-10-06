import { useEffect, useRef, type ReactNode } from "react";

/** The screens where the preview is pinned above the options (see `.zf-studio__preview`). */
const PINNED = "(max-width: 759px) and (min-height: 560px)";

/**
 * The preview column of a studio. On a phone it stays pinned at the top of the dialog's scrolling
 * part while the options below are scrolled. Whatever is scrolled or focused into view must stay
 * clear of it, so the scroller is given a scroll padding as tall as the preview (it follows the
 * preview as it resizes).
 */
export function StudioPreview({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    const scroller = el?.closest<HTMLElement>(".zf-dialog__scroll");
    if (!el || !scroller || typeof ResizeObserver === "undefined") return;
    const media = window.matchMedia?.(PINNED);
    const apply = () => {
      scroller.style.scrollPaddingTop = media?.matches ? `${el.offsetHeight + 8}px` : "";
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    media?.addEventListener?.("change", apply);
    return () => {
      observer.disconnect();
      media?.removeEventListener?.("change", apply);
      scroller.style.scrollPaddingTop = "";
    };
  }, []);
  return (
    <div ref={box} className="zf-studio__preview">
      {children}
    </div>
  );
}
