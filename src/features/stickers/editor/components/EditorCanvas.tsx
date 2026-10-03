import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useRef, useState } from "react";
import { Image as KonvaImage, Layer, Line, Stage, Transformer } from "react-konva";
import { createFreehand } from "../domain/geometry";
import { useEditor } from "../store/editorStore";
import { useEditorImage } from "../useEditorImage";
import { COLORS, SelectionShape } from "./SelectionShape";

export function EditorCanvas() {
  const { image, fit } = useEditorImage();
  const selections = useEditor((s) => s.selections);
  const activeId = useEditor((s) => s.activeId);
  const tool = useEditor((s) => s.tool);
  const mode = useEditor((s) => s.mode);
  const addSelection = useEditor((s) => s.addSelection);
  const updateSelection = useEditor((s) => s.updateSelection);
  const setActive = useEditor((s) => s.setActive);

  const nodes = useRef(new Map<string, Konva.Node>());
  const transformer = useRef<Konva.Transformer>(null);
  const [stroke, setStroke] = useState<number[] | null>(null);

  // Attach the transformer to the active shape (freehand strokes have no node).
  useEffect(() => {
    const node = activeId ? nodes.current.get(activeId) : undefined;
    transformer.current?.nodes(node ? [node] : []);
    transformer.current?.getLayer()?.batchDraw();
  }, [activeId, selections]);

  const pointer = (e: KonvaEventObject<PointerEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    return pos ? ([pos.x, pos.y] as const) : null;
  };

  const drawing = tool === "freehand";
  const onPointerDown = (e: KonvaEventObject<PointerEvent>) => {
    if (!drawing || stroke) return;
    const p = pointer(e);
    if (p) setStroke([p[0], p[1]]);
  };
  const onPointerMove = (e: KonvaEventObject<PointerEvent>) => {
    if (!stroke) return;
    const p = pointer(e);
    if (p && (p[0] !== stroke[stroke.length - 2] || p[1] !== stroke[stroke.length - 1])) {
      setStroke((prev) => (prev ? [...prev, p[0], p[1]] : prev));
    }
  };
  const onPointerUp = () => {
    if (stroke && stroke.length >= 4) {
      addSelection(createFreehand(stroke, mode, crypto.randomUUID()));
    }
    setStroke(null);
  };

  return (
    <Stage
      width={fit.width}
      height={fit.height}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <Layer>
        {image && <KonvaImage image={image} width={fit.width} height={fit.height} />}
        {selections.map((sel) => (
          <SelectionShape
            key={sel.id}
            selection={sel}
            active={activeId === sel.id}
            onSelect={() => setActive(sel.id)}
            onChange={(patch) => updateSelection(sel.id, patch)}
            registerNode={(id, node) => {
              if (node) nodes.current.set(id, node);
              else nodes.current.delete(id);
            }}
          />
        ))}
        {stroke && stroke.length > 2 && (
          <Line points={stroke} stroke={COLORS.active} strokeWidth={2} tension={0.5} />
        )}
        <Transformer
          ref={transformer}
          rotateEnabled
          enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
        />
      </Layer>
    </Stage>
  );
}
