import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Line, Rect, RegularPolygon, Star } from "react-konva";
import type { Selection } from "../domain/types";

export const COLORS = {
  active: "#3f5774",
  select: "#8d9a64",
  deselect: "#c4624b",
  selectFill: "rgba(141, 154, 100, 0.14)",
  deselectFill: "rgba(196, 98, 75, 0.12)",
};

interface Props {
  selection: Selection;
  active: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<Selection>) => void;
  registerNode: (id: string, node: Konva.Node | null) => void;
}

export function SelectionShape({
  selection,
  active,
  onSelect,
  onChange,
  registerNode,
}: Props) {
  const deselect = selection.mode === "deselect";
  const stroke = active ? COLORS.active : deselect ? COLORS.deselect : COLORS.select;
  const common = {
    stroke,
    strokeWidth: 2,
    fill: deselect ? COLORS.deselectFill : COLORS.selectFill,
    dash: deselect ? [10, 6] : undefined,
    draggable: active,
    onClick: onSelect,
    onTap: onSelect,
  };
  const moved = (e: KonvaEventObject<DragEvent>) =>
    onChange({ x: e.target.x(), y: e.target.y() });

  switch (selection.kind) {
    case "freehand":
      return (
        <>
          {/* Wide invisible line makes thin strokes easy to click */}
          <Line
            points={selection.points}
            stroke="#000"
            strokeWidth={16}
            opacity={0}
            tension={0.5}
            onClick={onSelect}
            onTap={onSelect}
            perfectDrawEnabled={false}
          />
          <Line
            points={selection.points}
            stroke={stroke}
            strokeWidth={2}
            tension={0.5}
            dash={common.dash}
            onClick={onSelect}
            onTap={onSelect}
          />
        </>
      );
    case "rectangle":
      return (
        <Rect
          {...common}
          ref={(n) => registerNode(selection.id, n)}
          x={selection.x}
          y={selection.y}
          width={selection.width}
          height={selection.height}
          rotation={selection.rotation}
          onDragEnd={moved}
          onTransformEnd={(e) => {
            const node = e.target as Konva.Rect;
            const width = Math.max(5, node.width() * node.scaleX());
            const height = Math.max(5, node.height() * node.scaleY());
            node.scale({ x: 1, y: 1 });
            onChange({
              x: node.x(),
              y: node.y(),
              width,
              height,
              rotation: node.rotation(),
            });
          }}
        />
      );
    case "triangle":
      return (
        <RegularPolygon
          {...common}
          ref={(n) => registerNode(selection.id, n)}
          x={selection.x}
          y={selection.y}
          sides={3}
          radius={selection.radius}
          rotation={selection.rotation}
          onDragEnd={moved}
          onTransformEnd={(e) => {
            const node = e.target as Konva.RegularPolygon;
            const radius = Math.max(5, selection.radius * node.scaleX());
            node.scale({ x: 1, y: 1 });
            onChange({ x: node.x(), y: node.y(), radius, rotation: node.rotation() });
          }}
        />
      );
    case "star":
      return (
        <Star
          {...common}
          ref={(n) => registerNode(selection.id, n)}
          x={selection.x}
          y={selection.y}
          numPoints={selection.numPoints}
          innerRadius={selection.innerRadius}
          outerRadius={selection.outerRadius}
          rotation={selection.rotation}
          onDragEnd={moved}
          onTransformEnd={(e) => {
            const node = e.target as Konva.Star;
            const k = node.scaleX();
            node.scale({ x: 1, y: 1 });
            onChange({
              x: node.x(),
              y: node.y(),
              innerRadius: Math.max(5, selection.innerRadius * k),
              outerRadius: Math.max(5, selection.outerRadius * k),
              rotation: node.rotation(),
            });
          }}
        />
      );
  }
}
