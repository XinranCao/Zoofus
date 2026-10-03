import { useLayoutEffect, useRef, useState } from "react";

/** The live content width of an element (0 until measured). */
export function useElementWidth<T extends HTMLElement>(): [
  React.RefObject<T | null>,
  number,
] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) =>
      setWidth(entries[0]?.contentRect.width ?? 0),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}
