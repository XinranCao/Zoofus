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
