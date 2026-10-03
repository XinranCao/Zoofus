import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useRef } from "react";
import { Line, Rect, RegularPolygon, Star } from "react-konva";
import { PALETTE } from "@/paper/pattern";
import type { Selection } from "../domain/types";

/**
 * The marching-ants look (design-system 02 §7): three stacked strokes keep the line visible over
 * any photo: a 5px loden halo at 28%, a 2px sheet base, and 2px dashes that march. Deselect uses
 * plum with a 3 5 dash. Mode is told by the dash pattern, never by colour alone.
 */
const HALO = "rgba(65, 71, 14, 0.28)";
const SHEET = PALETTE["sheet-50"];
const ANTS = PALETTE["loden-900"];
const ANTS_DESELECT = PALETTE["plum-900"];
const HIT_FILL = "rgba(251, 246, 238, 0.01)"; // near-invisible, so the inside of a shape can be clicked

interface Props {
  selection: Selection;
  active: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<Selection>) => void;
  registerNode: (id: string, node: Konva.Node | null) => void;
  registerAnts: (node: Konva.Shape | null, previous?: Konva.Shape | null) => void;
}

type Common = Record<string, unknown>;

/** The same Konva shape for a selection, with the given paint. */
function ShapeNode({
  sel,
  common,
  nodeRef,
}: {
  sel: Selection;
  common: Common;
  nodeRef?: (n: Konva.Shape | null) => void;
}) {
  switch (sel.kind) {
    case "freehand":
      return (
        <Line
          ref={nodeRef}
          points={sel.points}
          closed
          tension={0.5}
          lineJoin="round"
          lineCap="round"
          {...common}
        />
      );
    case "rectangle":
      return (
        <Rect
          ref={nodeRef}
          x={sel.x}
          y={sel.y}
          width={sel.width}
          height={sel.height}
          rotation={sel.rotation}
          {...common}
        />
      );
    case "triangle":
      return (
        <RegularPolygon
          ref={nodeRef}
          x={sel.x}
          y={sel.y}
          sides={3}
          radius={sel.radius}
          rotation={sel.rotation}
          {...common}
        />
      );
    case "star":
      return (
        <Star
          ref={nodeRef}
          x={sel.x}
          y={sel.y}
          numPoints={sel.numPoints}
          innerRadius={sel.innerRadius}
          outerRadius={sel.outerRadius}
          rotation={sel.rotation}
          {...common}
        />
      );
  }
}

export function SelectionShape({
  selection,
  active,
  onSelect,
  onChange,
  registerNode,
  registerAnts,
}: Props) {
  const deselect = selection.mode === "deselect";
  const twins = useRef<Konva.Shape[]>([]);
  const addTwin = (n: Konva.Shape | null) => {
    if (n && !twins.current.includes(n)) twins.current.push(n);
  };
  const antsRef = useRef<Konva.Shape | null>(null);

  const base: Common = {
    fillEnabled: false,
    strokeScaleEnabled: false,
    listening: false,
  };
  const halo: Common = { ...base, stroke: HALO, strokeWidth: active ? 7 : 5 };
  const sheet: Common = { ...base, stroke: SHEET, strokeWidth: 2 };

  // Dragging or transforming the interactive node moves the two non-interactive twins with it.
  const sync = (e: KonvaEventObject<Event>) => {
    const n = e.target;
    for (const t of twins.current) {
      t.setAttrs({
        x: n.x(),
        y: n.y(),
        rotation: n.rotation(),
        scaleX: n.scaleX(),
        scaleY: n.scaleY(),
      });
    }
    n.getLayer()?.batchDraw();
  };
  const resetTwins = () => {
    for (const t of twins.current) t.setAttrs({ scaleX: 1, scaleY: 1 });
  };

  const ants: Common = {
    stroke: deselect ? ANTS_DESELECT : ANTS,
    strokeWidth: 2,
    strokeScaleEnabled: false,
    dash: deselect ? [3, 5] : [6, 6],
    fill: selection.kind === "freehand" ? undefined : HIT_FILL,
    hitStrokeWidth: 16, // wide, so thin strokes are easy to click or tap
    draggable: active && selection.kind !== "freehand",
    onClick: onSelect,
    onTap: onSelect,
    onDragMove: sync,
    onTransform: sync,
  };

  const setAnts = (n: Konva.Shape | null) => {
    registerAnts(n, antsRef.current);
    antsRef.current = n;
    registerNode(selection.id, n);
  };

  const moved = (e: KonvaEventObject<DragEvent>) =>
    onChange({ x: e.target.x(), y: e.target.y() } as Partial<Selection>);

  let handlers: Common = {};
  switch (selection.kind) {
    case "rectangle":
      handlers = {
        onDragEnd: moved,
        onTransformEnd: (e: KonvaEventObject<Event>) => {
          const node = e.target as Konva.Rect;
          const width = Math.max(5, node.width() * node.scaleX());
          const height = Math.max(5, node.height() * node.scaleY());
          node.scale({ x: 1, y: 1 });
          resetTwins();
          onChange({
            x: node.x(),
            y: node.y(),
            width,
            height,
            rotation: node.rotation(),
          });
        },
      };
      break;
    case "triangle":
      handlers = {
        onDragEnd: moved,
        onTransformEnd: (e: KonvaEventObject<Event>) => {
          const node = e.target as Konva.RegularPolygon;
          const radius = Math.max(5, selection.radius * node.scaleX());
          node.scale({ x: 1, y: 1 });
          resetTwins();
          onChange({ x: node.x(), y: node.y(), radius, rotation: node.rotation() });
        },
      };
      break;
    case "star":
      handlers = {
        onDragEnd: moved,
        onTransformEnd: (e: KonvaEventObject<Event>) => {
          const node = e.target as Konva.Star;
          const k = node.scaleX();
          node.scale({ x: 1, y: 1 });
          resetTwins();
          onChange({
            x: node.x(),
            y: node.y(),
            innerRadius: Math.max(5, selection.innerRadius * k),
            outerRadius: Math.max(5, selection.outerRadius * k),
            rotation: node.rotation(),
          });
        },
      };
      break;
  }

  return (
    <>
      <ShapeNode sel={selection} common={halo} nodeRef={addTwin} />
      <ShapeNode sel={selection} common={sheet} nodeRef={addTwin} />
      <ShapeNode sel={selection} common={{ ...ants, ...handlers }} nodeRef={setAnts} />
    </>
  );
}
