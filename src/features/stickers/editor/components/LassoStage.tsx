/* A canvas widget is custom-interactive: role="application" with its own keyboard handling, focusable so shortcuts work. */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Circle,
  Image as KonvaImage,
  Layer,
  Line,
  Shape,
  Stage,
  Transformer,
} from "react-konva";
import { useTranslation } from "react-i18next";
import { PALETTE } from "@/paper/pattern";
import { createFreehand } from "../domain/geometry";
import { computeMaskPolygons, isMaskEmpty } from "../domain/mask";
import { useEditor } from "../store/editorStore";
import { useEditorImage } from "../useEditorImage";
import { useEditorShortcuts } from "../useEditorShortcuts";
import { useMarchingAnts } from "../useMarchingAnts";
import { SelectionShape } from "./SelectionShape";

const SHEET = PALETTE["sheet-50"];
const LODEN = PALETTE["loden-900"];
const PLUM = PALETTE["plum-900"];
const DIM = "rgba(65, 71, 14, 0.38)";
const SNAP = 12;

/** `+` and `−` cursors, so the mode is told by shape and not by colour alone. */
const cursor = (glyph: string) =>
  `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><circle cx='12' cy='12' r='9' fill='%23fbf6ee' stroke='%2341470e' stroke-width='2'/><path d='${glyph}' stroke='%2341470e' stroke-width='2' stroke-linecap='round'/></svg>") 12 12, crosshair`;
const PLUS = cursor("M12 7v10M7 12h10");
const MINUS = cursor("M7 12h10");

/**
 * The Konva stage inside the lasso well. Selections use a fixed logical size (the photo fitted
 * to 500px) and the stage is scaled to the well, so selections stay put when the layout changes.
 */
export function LassoStage({ width, height }: { width: number; height: number }) {
  const { t } = useTranslation();
  const { image, fit } = useEditorImage();
  const selections = useEditor((s) => s.selections);
  const activeId = useEditor((s) => s.activeId);
  const tool = useEditor((s) => s.tool);
  const mode = useEditor((s) => s.mode);
  const addSelection = useEditor((s) => s.addSelection);
  const updateSelection = useEditor((s) => s.updateSelection);
  const setActive = useEditor((s) => s.setActive);

  const onKeyDown = useEditorShortcuts();
  const registerAnts = useMarchingAnts();
  const nodes = useRef(new Map<string, Konva.Node>());
  const transformer = useRef<Konva.Transformer>(null);
  const [stroke, setStroke] = useState<number[] | null>(null);

  const scale = Math.min(width / fit.width, height / fit.height);
  const stageW = Math.round(fit.width * scale);
  const stageH = Math.round(fit.height * scale);

  // Attach the transformer to the active shape (freehand strokes have no handles).
  useEffect(() => {
    const node = activeId ? nodes.current.get(activeId) : undefined;
    transformer.current?.nodes(node ? [node] : []);
    transformer.current?.getLayer()?.batchDraw();
  }, [activeId, selections]);

  // The area outside every "select" region is dimmed (even-odd), in the stage's logical space.
  const mask = useMemo(
    () => computeMaskPolygons(selections, fit, fit),
    [selections, fit],
  );
  const hasMask = !isMaskEmpty(mask);

  const pointer = (e: KonvaEventObject<PointerEvent>) => {
    const p = e.target.getStage()?.getRelativePointerPosition();
    return p ? ([p.x, p.y] as const) : null;
  };
  const drawing = tool === "freehand";
  const onPointerDown = (e: KonvaEventObject<PointerEvent>) => {
    if (!drawing || stroke) return;
    const p = pointer(e);
    if (p) {
      live.current = [p[0], p[1]];
      setStroke(live.current);
    }
  };
  const stageRef = useRef<Konva.Stage>(null);
  const live = useRef<number[] | null>(null);
  const drawingNow = stroke !== null;
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // While a stroke is under way the pointer is tracked on the window, so leaving the photo does not
  // break the line: outside points are clamped to the photo's border. Going out on one side and
  // coming back on another therefore runs along the border, round the corner, and the corner ends
  // up inside the selection.
  useEffect(() => {
    if (!drawingNow) return;
    const toPoint = (e: PointerEvent) => {
      const box = stageRef.current?.container().getBoundingClientRect();
      if (!box || box.width === 0) return null;
      const x = Math.min(Math.max((e.clientX - box.left) / scale, 0), fit.width);
      const y = Math.min(Math.max((e.clientY - box.top) / scale, 0), fit.height);
      return [x, y] as const;
    };
    const move = (e: PointerEvent) => {
      const p = toPoint(e);
      const pts = live.current;
      if (!p || !pts) return;
      if (p[0] === pts[pts.length - 2] && p[1] === pts[pts.length - 1]) return;
      live.current = [...pts, p[0], p[1]];
      setStroke(live.current);
    };
    const up = () => {
      const pts = live.current;
      live.current = null;
      if (pts && pts.length >= 4) {
        // Within a few pixels of the start, the loop is closed exactly.
        const closeEnough =
          Math.hypot(pts[0]! - pts[pts.length - 2]!, pts[1]! - pts[pts.length - 1]!) <
          SNAP;
        const points = closeEnough ? [...pts, pts[0]!, pts[1]!] : pts;
        addSelection(createFreehand(points, modeRef.current, crypto.randomUUID()));
      }
      setStroke(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [drawingNow, scale, fit.width, fit.height, addSelection]);

  const active = selections.find((s) => s.id === activeId);
  const startOf = stroke ?? (active?.kind === "freehand" ? active.points : null);
  const deselect = mode === "deselect";

  return (
    <div
      tabIndex={0}
      role="application"
      aria-label={t("maker.canvas")}
      onKeyDown={onKeyDown}
      style={{
        touchAction: "none",
        cursor: drawing ? (deselect ? MINUS : PLUS) : "default",
        width: stageW,
        height: stageH,
      }}
    >
      <Stage
        ref={stageRef}
        width={stageW}
        height={stageH}
        scaleX={scale}
        scaleY={scale}
        onPointerDown={onPointerDown}
      >
        <Layer>
          {image && (
            <KonvaImage
              image={image}
              width={fit.width}
              height={fit.height}
              listening={false}
            />
          )}
          {hasMask && (
            <Shape
              listening={false}
              sceneFunc={(ctx) => {
                const c = ctx._context;
                c.beginPath();
                c.rect(0, 0, fit.width, fit.height);
                for (const poly of mask) {
                  for (const ring of poly) {
                    if (ring.length < 3) continue;
                    c.moveTo(ring[0]![0], ring[0]![1]);
                    for (let i = 1; i < ring.length; i++)
                      c.lineTo(ring[i]![0], ring[i]![1]);
                    c.closePath();
                  }
                }
                c.fillStyle = DIM;
                c.fill("evenodd");
              }}
            />
          )}
          {selections.map((sel) => (
            <SelectionShape
              key={sel.id}
              selection={sel}
              active={activeId === sel.id}
              onSelect={() => setActive(sel.id)}
              onChange={(patch) => updateSelection(sel.id, patch)}
              registerAnts={registerAnts}
              registerNode={(id, node) => {
                if (node) nodes.current.set(id, node);
                else nodes.current.delete(id);
              }}
            />
          ))}
          {stroke && stroke.length > 2 && (
            <>
              <Line
                points={stroke}
                stroke="rgba(65, 71, 14, 0.28)"
                strokeWidth={5}
                tension={0.5}
                strokeScaleEnabled={false}
                listening={false}
              />
              <Line
                points={stroke}
                stroke={SHEET}
                strokeWidth={2}
                tension={0.5}
                strokeScaleEnabled={false}
                listening={false}
              />
              <Line
                points={stroke}
                stroke={deselect ? PLUM : LODEN}
                strokeWidth={2}
                dash={deselect ? [3, 5] : [6, 6]}
                tension={0.5}
                strokeScaleEnabled={false}
                listening={false}
              />
            </>
          )}
          {startOf && startOf.length >= 2 && (
            // marks where to close the loop: a sheet dot with a loden ring
            <Circle
              x={startOf[0]}
              y={startOf[1]}
              radius={4.5}
              fill={SHEET}
              stroke={LODEN}
              strokeWidth={2}
              strokeScaleEnabled={false}
              listening={false}
            />
          )}
          <Transformer
            ref={transformer}
            rotateEnabled
            anchorSize={10}
            anchorFill={SHEET}
            anchorStroke={PLUM}
            anchorStrokeWidth={2}
            anchorCornerRadius={0}
            borderStroke={PLUM}
            borderStrokeWidth={1}
            borderDash={[4, 4]}
            enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
          />
        </Layer>
      </Stage>
    </div>
  );
}
