import polygonClipping from "polygon-clipping";
import type { MultiPolygon, Polygon, Ring } from "polygon-clipping";
import { scalePoints } from "@/lib/image";
import { joinOpenPathsToClosedRings, selectionToPoints } from "./geometry";
import type { Selection, Size } from "./types";

/** Freehand paths whose ends are closer than this (image px) are joined into one ring. */
export const JOIN_THRESHOLD = 100;

function pointsToPolygon(points: number[]): Polygon {
  const ring: Ring = [];
  for (let i = 0; i < points.length; i += 2) ring.push([points[i]!, points[i + 1]!]);
  return [ring];
}

/**
 * The final cut-out area in image pixels: (union of "select" selections) minus (union of
 * "deselect" selections), clipped to the image. Selections are given in display coordinates.
 */
export function computeMaskPolygons(
  selections: Selection[],
  display: Size,
  image: Size,
): MultiPolygon {
  const toImage = (pts: number[]) =>
    scalePoints(pts, display.width, display.height, image.width, image.height);

  const selects = selections.filter((s) => s.mode === "select");
  const deselects = selections.filter((s) => s.mode === "deselect");

  const freehand = (list: Selection[]) =>
    list
      .filter((s) => s.kind === "freehand" && s.points.length >= 4)
      .map((s) => toImage(selectionToPoints(s)));
  const shapes = (list: Selection[]) =>
    list
      .filter((s) => s.kind !== "freehand")
      .map((s) => toImage(selectionToPoints(s)))
      .filter((pts) => pts.length >= 6);

  // Freehand selects: join open strokes into rings; isolated strokes are auto-closed.
  const selectPaths = freehand(selects);
  const { rings, used } = joinOpenPathsToClosedRings(selectPaths, JOIN_THRESHOLD);
  const autoClosed = selectPaths.filter((path, i) => !used[i] && path.length >= 6);

  const selectPolys = [...rings, ...autoClosed, ...shapes(selects)].map(pointsToPolygon);
  if (selectPolys.length === 0) return [];

  let area: MultiPolygon = polygonClipping.union(
    selectPolys[0]!,
    ...selectPolys.slice(1),
  );

  const deselectPolys = [...freehand(deselects), ...shapes(deselects)]
    .filter((pts) => pts.length >= 6)
    .map(pointsToPolygon);
  for (const hole of deselectPolys) {
    if (area.length === 0) break;
    area = polygonClipping.difference(area, hole);
  }
  if (area.length === 0) return [];

  const bounds: Polygon = [
    [
      [0, 0],
      [image.width, 0],
      [image.width, image.height],
      [0, image.height],
    ],
  ];
  return polygonClipping.intersection(area, bounds);
}

export function isMaskEmpty(mask: MultiPolygon): boolean {
  return !mask.some((poly) => poly[0] && poly[0].length >= 3);
}
