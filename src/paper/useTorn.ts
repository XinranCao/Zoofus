import { useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { tornVars, type TornOptions } from "./torn";

/** A stable seed: the caller's, or a React-generated id that never changes for this element. */
export function useSeed(seed?: string | number): string {
  const auto = useId();
  return seed != null ? String(seed) : auto;
}

/** Size buckets are 64px, so resizing re-computes the polygon only when a bucket boundary is crossed. */
export function sizeBucket(width: number, height: number): string {
  return Math.round(width / 64) + "x" + Math.round(height / 64);
}

/**
 * Torn clip-path variables for an element. With `measure`, fluid containers are observed and the
 * polygon is rebuilt only when their 64px size bucket changes; fixed-size elements skip observing.
 */
export function useTorn<T extends HTMLElement>(
  seed: string,
  opts: TornOptions,
  measure = false,
): [RefObject<T | null>, ReturnType<typeof tornVars>] {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    if (!measure || !ref.current || typeof ResizeObserver === "undefined") return;
    let last = "";
    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box) return;
      const key = sizeBucket(box.width, box.height);
      if (key !== last) {
        last = key;
        setSize({ w: box.width, h: box.height });
      }
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [measure]);

  return [ref, tornVars(seed, { ...opts, ...(size ?? {}) })];
}
