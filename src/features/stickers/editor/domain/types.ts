export type SelectionMode = "select" | "deselect";
export type Tool = "freehand" | "rectangle" | "triangle" | "star";
export type ShapeKind = Exclude<Tool, "freehand">;

export interface Size {
  width: number;
  height: number;
}

interface SelectionBase {
  id: string;
  mode: SelectionMode;
}

/** Flat [x1, y1, x2, y2, ...] path in display coordinates. */
export interface FreehandSelection extends SelectionBase {
  kind: "freehand";
  points: number[];
}

export interface RectangleSelection extends SelectionBase {
  kind: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface TriangleSelection extends SelectionBase {
  kind: "triangle";
  x: number;
  y: number;
  radius: number;
  rotation: number;
}

export interface StarSelection extends SelectionBase {
  kind: "star";
  x: number;
  y: number;
  numPoints: number;
  innerRadius: number;
  outerRadius: number;
  rotation: number;
}

export type ShapeSelection = RectangleSelection | TriangleSelection | StarSelection;
export type Selection = FreehandSelection | ShapeSelection;

export interface Border {
  color: string;
  width: number;
}
