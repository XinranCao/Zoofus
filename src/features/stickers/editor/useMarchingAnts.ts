import type Konva from "konva";
import { useCallback, useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

/** One dash cycle ("6 6" or "3 5" dashes) moves 12px in the design's 600ms. */
const PERIOD_MS = 600;
const TRAVEL = 12;

/**
 * Animates `dashOffset` of every registered line, so the dashes march. Frozen under
 * prefers-reduced-motion. Returns a ref-callback factory: `register(node)` / `register(null)`.
 */
export function useMarchingAnts() {
  const nodes = useRef(new Set<Konva.Shape>());
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      nodes.current.forEach((n) => n.dashOffset(0));
      return;
    }
    let raf = 0;
    const tick = (now: number) => {
      const offset = -((now % PERIOD_MS) / PERIOD_MS) * TRAVEL;
      const layers = new Set<Konva.Layer | null | undefined>();
      nodes.current.forEach((n) => {
        n.dashOffset(offset);
        layers.add(n.getLayer());
      });
      layers.forEach((l) => l?.batchDraw());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  return useCallback((node: Konva.Shape | null, previous?: Konva.Shape | null) => {
    if (previous) nodes.current.delete(previous);
    if (node) nodes.current.add(node);
  }, []);
}
