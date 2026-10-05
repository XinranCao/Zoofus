import type {
  FreehandSelection,
  Selection,
  SelectionMode,
  ShapeKind,
  ShapeSelection,
} from "./types";

const toRad = (deg: number) => (deg * Math.PI) / 180;

export function createShape(
  kind: ShapeKind,
  mode: SelectionMode,
  id: string,
): ShapeSelection {
  switch (kind) {
    case "rectangle":
      return { id, mode, kind, x: 100, y: 100, width: 200, height: 150, rotation: 0 };
    case "triangle":
      return { id, mode, kind, x: 150, y: 100, radius: 100, rotation: 0 };
    case "star":
      return {
        id,
        mode,
        kind,
        x: 250,
        y: 250,
        numPoints: 5,
        innerRadius: 60,
        outerRadius: 120,
        rotation: 0,
      };
  }
}

/** Smallest side, in logical px, that a dragged-out shape must have to count (a click is not a shape). */
export const MIN_DRAG = 8;

/**
 * A shape that fits the box dragged from (x0, y0) to (x1, y1), whichever corner it started at.
 * The regular shapes keep their proportions and sit in the middle of the box; null when the drag
 * was too small to mean anything.
 */
export function createShapeFromDrag(
  kind: ShapeKind,
  mode: SelectionMode,
  id: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): ShapeSelection | null {
  const x = Math.min(x0, x1);
  const y = Math.min(y0, y1);
  const w = Math.abs(x1 - x0);
  const h = Math.abs(y1 - y0);
  if (w < MIN_DRAG || h < MIN_DRAG) return null;
  switch (kind) {
    case "rectangle":
      return { id, mode, kind, x, y, width: w, height: h, rotation: 0 };
    case "triangle": {
      // circumradius r: the box is 1.732 r wide and 1.5 r tall, the apex r above the centre
      const r = Math.min(w / 1.732, h / 1.5);
      return {
        id,
        mode,
        kind,
        x: x + w / 2,
        y: y + h / 2 + r * 0.25,
        radius: r,
        rotation: 0,
      };
    }
    case "star": {
      // outer radius R: the box is 1.902 R wide and 1.809 R tall, the top point R above the centre
      const R = Math.min(w / 1.902, h / 1.809);
      return {
        id,
        mode,
        kind,
        x: x + w / 2,
        y: y + (h - 1.809 * R) / 2 + R,
        numPoints: 5,
        innerRadius: R * 0.5,
        outerRadius: R,
        rotation: 0,
      };
    }
  }
}

export function createFreehand(
  points: number[],
  mode: SelectionMode,
  id: string,
): FreehandSelection {
  return { id, mode, kind: "freehand", points };
}

/** The outline of a selection as a flat [x1, y1, ...] polygon, in display coordinates. */
export function selectionToPoints(sel: Selection): number[] {
  switch (sel.kind) {
    case "freehand":
      return sel.points;
    case "triangle": {
      const out: number[] = [];
      for (let i = 0; i < 3; i++) {
        const a = (Math.PI * 2 * i) / 3 - Math.PI / 2 + toRad(sel.rotation);
        out.push(sel.x + sel.radius * Math.cos(a), sel.y + sel.radius * Math.sin(a));
      }
      return out;
    }
    case "rectangle": {
      const rad = toRad(sel.rotation);
      const corners: [number, number][] = [
        [0, 0],
        [sel.width, 0],
        [sel.width, sel.height],
        [0, sel.height],
      ];
      return corners.flatMap(([cx, cy]) => [
        sel.x + cx * Math.cos(rad) - cy * Math.sin(rad),
        sel.y + cx * Math.sin(rad) + cy * Math.cos(rad),
      ]);
    }
    case "star": {
      const out: number[] = [];
      for (let i = 0; i < sel.numPoints; i++) {
        const a = (Math.PI * 2 * i) / sel.numPoints - Math.PI / 2 + toRad(sel.rotation);
        out.push(
          sel.x + sel.outerRadius * Math.cos(a),
          sel.y + sel.outerRadius * Math.sin(a),
        );
        const b = a + Math.PI / sel.numPoints;
        out.push(
          sel.x + sel.innerRadius * Math.cos(b),
          sel.y + sel.innerRadius * Math.sin(b),
        );
      }
      return out;
    }
  }
}

/**
 * Join open paths whose end meets another path's start (within `threshold`) into closed
 * rings. Returns the closed rings and which input paths were consumed.
 */
export function joinOpenPathsToClosedRings(paths: number[][], threshold: number) {
  const rings: number[][] = [];
  const used: boolean[] = new Array(paths.length).fill(false);

  for (let i = 0; i < paths.length; i++) {
    if (used[i]) continue;
    let ring = [...paths[i]!];
    const joined = [i];

    let changed = true;
    while (changed) {
      changed = false;
      for (let j = 0; j < paths.length; j++) {
        if (joined.includes(j)) continue;
        const dist = Math.hypot(
          ring[ring.length - 2]! - paths[j]![0]!,
          ring[ring.length - 1]! - paths[j]![1]!,
        );
        if (dist < threshold) {
          ring = ring.concat(paths[j]!.slice(2));
          joined.push(j);
          changed = true;
        }
      }
    }
    const closeDist = Math.hypot(
      ring[0]! - ring[ring.length - 2]!,
      ring[1]! - ring[ring.length - 1]!,
    );
    if (closeDist < threshold && ring.length >= 6) {
      rings.push(ring);
      joined.forEach((idx) => (used[idx] = true));
    }
  }
  return { rings, used };
}

/** The same selection shifted by (dx, dy) in display coordinates. */
export function translateSelection(sel: Selection, dx: number, dy: number): Selection {
  if (sel.kind === "freehand") {
    return { ...sel, points: sel.points.map((v, i) => v + (i % 2 === 0 ? dx : dy)) };
  }
  return { ...sel, x: sel.x + dx, y: sel.y + dy };
}

/** A starting selection for someone who cannot drag: `kind` (a rectangle for the freehand tool), 60% of the photo, in its middle. */
export function createDefaultSelection(
  kind: ShapeKind | "freehand",
  mode: SelectionMode,
  id: string,
  fit: { width: number; height: number },
): ShapeSelection {
  const k: ShapeKind = kind === "freehand" ? "rectangle" : kind;
  return createShapeFromDrag(
    k,
    mode,
    id,
    fit.width * 0.2,
    fit.height * 0.2,
    fit.width * 0.8,
    fit.height * 0.8,
  )!;
}

/** A rectangle over the whole photo ("use the whole photo"). */
export function createWholePhoto(
  mode: SelectionMode,
  id: string,
  fit: { width: number; height: number },
): ShapeSelection {
  return {
    id,
    mode,
    kind: "rectangle",
    x: 0,
    y: 0,
    width: fit.width,
    height: fit.height,
    rotation: 0,
  };
}

/** Smallest a selection can be made with the keyboard, in logical px. */
const MIN_SIZE = 20;

/** The same selection `dx` wider and `dy` taller (negative: narrower, shorter), keeping its centre. */
export function resizeSelection(sel: Selection, dx: number, dy: number): Selection {
  switch (sel.kind) {
    case "rectangle": {
      const width = Math.max(MIN_SIZE, sel.width + dx);
      const height = Math.max(MIN_SIZE, sel.height + dy);
      return {
        ...sel,
        width,
        height,
        x: sel.x - (width - sel.width) / 2,
        y: sel.y - (height - sel.height) / 2,
      };
    }
    case "triangle":
      return { ...sel, radius: Math.max(MIN_SIZE / 2, sel.radius + (dx - dy) / 2) };
    case "star": {
      const outerRadius = Math.max(MIN_SIZE / 2, sel.outerRadius + (dx - dy) / 2);
      return {
        ...sel,
        outerRadius,
        innerRadius: (sel.innerRadius / sel.outerRadius) * outerRadius,
      };
    }
    case "freehand": {
      const xs = sel.points.filter((_, i) => i % 2 === 0);
      const ys = sel.points.filter((_, i) => i % 2 === 1);
      const [x0, x1, y0, y1] = [
        Math.min(...xs),
        Math.max(...xs),
        Math.min(...ys),
        Math.max(...ys),
      ];
      const w = Math.max(1, x1 - x0);
      const h = Math.max(1, y1 - y0);
      const fx = Math.max(MIN_SIZE, w + dx) / w;
      const fy = Math.max(MIN_SIZE, h + dy) / h;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      return {
        ...sel,
        points: sel.points.map((v, i) =>
          i % 2 === 0 ? cx + (v - cx) * fx : cy + (v - cy) * fy,
        ),
      };
    }
  }
}

/** The selection's box as percentages of the photo: left, top, width, height. */
export function selectionBoxPercent(
  sel: Selection,
  fit: { width: number; height: number },
): { left: number; top: number; width: number; height: number } {
  const pts = selectionToPoints(sel);
  const xs = pts.filter((_, i) => i % 2 === 0);
  const ys = pts.filter((_, i) => i % 2 === 1);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const pc = (v: number, of: number) => Math.round((v / of) * 100);
  return {
    left: pc(x0, fit.width),
    top: pc(y0, fit.height),
    width: pc(Math.max(...xs) - x0, fit.width),
    height: pc(Math.max(...ys) - y0, fit.height),
  };
}
