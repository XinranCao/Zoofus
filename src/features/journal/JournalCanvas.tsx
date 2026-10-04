import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Image as KImage,
  Layer,
  Line,
  Rect,
  Stage,
  Text,
  Transformer,
} from "react-konva";
import { useLoadedImage } from "@/lib/image";
import { hex, PALETTE } from "@/paper/pattern";
import { fontOf, ensureFont } from "./fonts";
import {
  STICKER_BASE,
  newId,
  type Item,
  type PageSpec,
  type StickerItem,
  type StrokeItem,
  type StrokeTool,
  type TapeItem,
  type TextItem,
} from "./journal.schema";
import { drawPaper } from "./paper";
import { topZ, type Op } from "./ops";
import { decodeStroke, strokesFromLine, touchesStroke } from "./strokes";
import { useTapeCanvas } from "./tapeCanvas";
import type { JournalTool, PenState, TextStyle } from "./store/journalStore";

export interface StickerInfo {
  url: string;
  w: number;
  h: number;
  name: string;
}
/** Where a sticker pointer (`ref`) finds its picture: your own stickers, or a picture kept in the journal. */
export type StickerResolver = (ref: string) => StickerInfo | null;

const PLUM = PALETTE["plum-900"];
const SHEET = PALETTE["sheet-50"];

/** How a pen tool looks: width factor, opacity and how it is drawn. */
const PEN_LOOK: Record<
  StrokeTool,
  {
    alpha: number;
    compo?: GlobalCompositeOperation;
    dash?: (s: number) => number[];
    wide: number;
  }
> = {
  pen: { alpha: 1, wide: 1 },
  pencil: { alpha: 0.78, wide: 0.8, dash: (s) => [s * 0.06, s * 0.5] },
  marker: { alpha: 0.5, compo: "multiply", wide: 2.6 },
  crayon: { alpha: 0.85, wide: 1.7, dash: (s) => [s * 0.5, s * 0.34] },
};

/** Cache of decoded strokes, so a redraw does not decode every line again. */
const decoded = new Map<string, number[]>();
function pointsOf(item: StrokeItem): number[] {
  const key = item.id + item.pts;
  let p = decoded.get(key);
  if (!p) {
    p = decodeStroke(item.pts);
    if (decoded.size > 2000) decoded.clear();
    decoded.set(key, p);
  }
  return p;
}

// ------------------------------------------------------------------ the nodes

interface NodeProps<T> {
  item: T;
  editable: boolean;
  onSelect: (id: string) => void;
  onPut: (item: Item) => void;
  register: (id: string, node: Konva.Node | null) => void;
  /** The picture has loaded, so the node now exists and can take handles. */
  onReady?: () => void;
}

const StickerNode = memo(function StickerNode({
  item,
  info,
  editable,
  onSelect,
  onPut,
  register,
  onReady,
}: NodeProps<StickerItem> & { info: StickerInfo | null }) {
  const image = useLoadedImage(info?.url ?? null, "anonymous");
  useEffect(() => {
    if (image) onReady?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- when the picture arrives
  }, [image]);
  const long = info ? Math.max(info.w, info.h) : 1;
  const f = (STICKER_BASE * item.sc) / long;
  const w = (info?.w ?? 100) * f;
  const h = (info?.h ?? 100) * f;
  if (!image) {
    // a stand-in while it loads, or if it is gone (the sticker was deleted)
    return (
      <Rect
        ref={(n) => register(item.id, n)}
        x={item.x}
        y={item.y}
        width={w || 120}
        height={h || 120}
        offsetX={(w || 120) / 2}
        offsetY={(h || 120) / 2}
        rotation={item.r}
        fill="rgba(251,246,238,0.5)"
        stroke="#6c4a3b"
        dash={[6, 6]}
        strokeWidth={1.5}
        draggable={editable}
        onClick={() => onSelect(item.id)}
        onTap={() => onSelect(item.id)}
        onDragEnd={(e) => onPut({ ...item, x: e.target.x(), y: e.target.y() })}
      />
    );
  }
  return (
    <KImage
      ref={(n) => register(item.id, n)}
      image={image}
      x={item.x}
      y={item.y}
      width={w}
      height={h}
      offsetX={w / 2}
      offsetY={h / 2}
      rotation={item.r}
      draggable={editable}
      listening={editable}
      onClick={() => onSelect(item.id)}
      onTap={() => onSelect(item.id)}
      onDragStart={() => onSelect(item.id)}
      onDragEnd={(e) => onPut({ ...item, x: e.target.x(), y: e.target.y() })}
      onTransformEnd={(e) => {
        const n = e.target;
        const k = (Math.abs(n.scaleX()) + Math.abs(n.scaleY())) / 2;
        n.scaleX(1);
        n.scaleY(1);
        onPut({
          ...item,
          x: n.x(),
          y: n.y(),
          r: Math.round(n.rotation() * 10) / 10,
          sc: Math.min(40, Math.max(0.02, item.sc * k)),
        });
      }}
    />
  );
});

const TapeNode = memo(function TapeNode({
  item,
  editable,
  onSelect,
  onPut,
  register,
}: NodeProps<TapeItem>) {
  const canvas = useTapeCanvas(
    item.tape.pattern,
    item.len,
    item.tape.thickness,
    item.tape.ends,
    item.id,
  );
  if (!canvas) return null;
  const w = item.len;
  const h = item.tape.thickness;
  return (
    <KImage
      ref={(n) => register(item.id, n)}
      image={canvas}
      x={item.x}
      y={item.y}
      width={w}
      height={h}
      offsetX={w / 2}
      offsetY={h / 2}
      rotation={item.r}
      opacity={item.tape.opacity}
      globalCompositeOperation="multiply"
      draggable={editable}
      listening={editable}
      onClick={() => onSelect(item.id)}
      onTap={() => onSelect(item.id)}
      onDragStart={() => onSelect(item.id)}
      onDragEnd={(e) => onPut({ ...item, x: e.target.x(), y: e.target.y() })}
      onTransformEnd={(e) => {
        const n = e.target;
        const sx = n.scaleX();
        const sy = n.scaleY();
        n.scaleX(1);
        n.scaleY(1);
        onPut({
          ...item,
          x: n.x(),
          y: n.y(),
          r: Math.round(n.rotation() * 10) / 10,
          len: Math.min(3000, Math.max(10, item.len * Math.abs(sx))),
          tape: {
            ...item.tape,
            thickness: Math.min(36, Math.max(12, item.tape.thickness * Math.abs(sy))),
          },
        });
      }}
    />
  );
});

const TextNodeView = memo(function TextNodeView({
  item,
  editable,
  onSelect,
  onPut,
  register,
}: NodeProps<TextItem>) {
  const ref = useRef<Konva.Text>(null);
  const [ready, setReady] = useState(0);
  const font = fontOf(item.font);
  useEffect(() => {
    let alive = true;
    void ensureFont(item.font, item.text).then(() => alive && setReady((n) => n + 1));
    return () => {
      alive = false;
    };
  }, [item.font, item.text]);
  // the item's x, y is the middle of its box: rotate and scale about the middle
  useLayoutEffect(() => {
    const n = ref.current;
    if (!n) return;
    n.offsetX(n.width() / 2);
    n.offsetY(n.height() / 2);
    n.getLayer()?.batchDraw();
  }, [item.text, item.size, item.font, item.w, item.bold, ready]);
  return (
    <Text
      ref={(n) => {
        ref.current = n;
        register(item.id, n);
      }}
      x={item.x}
      y={item.y}
      text={item.text || " "}
      fontFamily={font.family}
      fontSize={item.size}
      fontStyle={item.bold ? "bold" : "normal"}
      fill={hex(item.color)}
      width={item.w}
      lineHeight={1.25}
      rotation={item.r}
      draggable={editable}
      listening={editable}
      onClick={() => onSelect(item.id)}
      onTap={() => onSelect(item.id)}
      onDragStart={() => onSelect(item.id)}
      onDragEnd={(e) => onPut({ ...item, x: e.target.x(), y: e.target.y() })}
      onTransformEnd={(e) => {
        const n = e.target as Konva.Text;
        const sx = Math.abs(n.scaleX());
        const sy = Math.abs(n.scaleY());
        n.scaleX(1);
        n.scaleY(1);
        const sideResize = Math.abs(sx - sy) > 0.02;
        onPut({
          ...item,
          x: n.x(),
          y: n.y(),
          r: Math.round(n.rotation() * 10) / 10,
          ...(sideResize
            ? { w: Math.min(4000, Math.max(20, (item.w ?? n.width()) * sx)) }
            : {
                size: Math.min(600, Math.max(4, item.size * sx)),
                w: item.w ? item.w * sx : undefined,
              }),
        });
      }}
    />
  );
});

/** A pen stroke. Marker is wide and see-through, pencil is thin and grainy, crayon is broken. */
function StrokeLine({
  item,
  points,
  live,
}: {
  item: Pick<StrokeItem, "tool" | "color" | "size">;
  points: number[];
  live?: boolean;
}) {
  const look = PEN_LOOK[item.tool];
  const width = item.size * look.wide;
  return (
    <Line
      points={points}
      stroke={hex(item.color)}
      strokeWidth={width}
      opacity={look.alpha}
      lineCap="round"
      lineJoin="round"
      tension={0.4}
      dash={look.dash?.(width)}
      globalCompositeOperation={look.compo}
      listening={false}
      perfectDrawEnabled={false}
      shadowForStrokeEnabled={false}
      name={live ? "live" : undefined}
    />
  );
}

// ------------------------------------------------------------------ the canvas

export interface EditorBinding {
  tool: JournalTool;
  selectedId: string | null;
  pen: PenState;
  text: TextStyle;
  onSelect: (id: string | null) => void;
  /** Local changes, as operations; `group` joins a gesture into one undo step. */
  onOps: (ops: Op[]) => void;
}

/**
 * The page: its paper and everything on it. With `editor` it is a working surface (select, move,
 * turn, resize, draw, erase, place text); without, it only shows the page.
 */
export const JournalCanvas = memo(function JournalCanvas({
  page,
  items,
  resolve,
  width,
  editor,
  stageRef,
}: {
  page: PageSpec;
  items: Item[];
  resolve: StickerResolver;
  /** CSS pixels across. The height follows the page's proportions. */
  width: number;
  editor?: EditorBinding;
  stageRef?: React.Ref<Konva.Stage>;
}) {
  const k = width / page.width;
  const paper = useMemo(() => drawPaper(page), [page]);
  const nodes = useRef(new Map<string, Konva.Node>());
  const transformer = useRef<Konva.Transformer>(null);
  const [line, setLine] = useState<number[] | null>(null);
  const liveLine = useRef<number[] | null>(null);
  const [erased, setErased] = useState<Set<string>>(new Set());
  const [nodeVersion, setNodeVersion] = useState(0);
  const bump = useCallback(() => setNodeVersion((v) => v + 1), []);
  const erasing = useRef<Set<string> | null>(null);

  const editing = editor?.tool === "select";
  const selectedId = editor?.selectedId ?? null;
  const selected = items.find((i) => i.id === selectedId);

  // The handles follow the selected object.
  useEffect(() => {
    const n = selectedId && editing ? nodes.current.get(selectedId) : undefined;
    transformer.current?.nodes(n ? [n] : []);
    transformer.current?.getLayer()?.batchDraw();
  }, [selectedId, editing, items, nodeVersion]);

  const register = (id: string, node: Konva.Node | null) => {
    if (node) nodes.current.set(id, node);
    else nodes.current.delete(id);
  };
  const onSelect = (id: string) => editing && editor?.onSelect(id);
  const onPut = (item: Item) => editor?.onOps([{ k: "put", item }]);

  const pointer = (e: KonvaEventObject<PointerEvent>) => {
    const p = e.target.getStage()?.getRelativePointerPosition();
    return p ? ([p.x, p.y] as const) : null;
  };

  const down = (e: KonvaEventObject<PointerEvent>) => {
    if (!editor) return;
    const p = pointer(e);
    if (!p) return;
    if (editor.tool === "draw") {
      liveLine.current = [p[0], p[1]];
      setLine(liveLine.current);
    } else if (editor.tool === "erase") {
      erasing.current = new Set();
      eraseAt(p[0], p[1]);
    } else if (editor.tool === "select" && e.target === e.target.getStage()) {
      editor.onSelect(null);
    } else if (editor.tool === "text") {
      const id = newId();
      editor.onOps([
        {
          k: "put",
          item: {
            t: "x",
            id,
            x: p[0],
            y: p[1],
            r: 0,
            z: topZ(items),
            text: "",
            font: editor.text.font,
            size: editor.text.size,
            color: editor.text.color,
            bold: editor.text.bold || undefined,
          },
        },
      ]);
      editor.onSelect(id);
    }
  };
  const eraseAt = (x: number, y: number) => {
    const set = erasing.current;
    if (!set) return;
    const radius = Math.max(8, editor?.pen.size ?? 8) * 1.4;
    let changed = false;
    for (const i of items) {
      if (i.t !== "p" || set.has(i.id)) continue;
      const half = (i.size * PEN_LOOK[i.tool].wide) / 2;
      if (touchesStroke(pointsOf(i), x, y, radius + half)) {
        set.add(i.id);
        changed = true;
      }
    }
    if (changed) setErased(new Set(set));
  };
  const move = (e: KonvaEventObject<PointerEvent>) => {
    if (!editor) return;
    const p = pointer(e);
    if (!p) return;
    if (liveLine.current) {
      const l = liveLine.current;
      const lx = l[l.length - 2]!;
      const ly = l[l.length - 1]!;
      if (Math.hypot(p[0] - lx, p[1] - ly) < 1.2) return;
      liveLine.current = [...l, p[0], p[1]];
      setLine(liveLine.current);
    } else if (erasing.current) {
      eraseAt(p[0], p[1]);
    }
  };
  const up = () => {
    if (!editor) return;
    if (liveLine.current) {
      const pts = liveLine.current;
      liveLine.current = null;
      setLine(null);
      const pieces = strokesFromLine(pts);
      let z = topZ(items);
      editor.onOps(
        pieces.map((s) => ({
          k: "put" as const,
          item: {
            t: "p" as const,
            id: newId(),
            x: 0,
            y: 0,
            r: 0,
            z: z++,
            tool: editor.pen.tool,
            color: editor.pen.color,
            size: editor.pen.size,
            pts: s,
          },
        })),
      );
    } else if (erasing.current) {
      const ids = [...erasing.current];
      erasing.current = null;
      setErased(new Set());
      if (ids.length) editor.onOps(ids.map((id) => ({ k: "del" as const, id })));
    }
  };

  const cursor =
    editor?.tool === "draw"
      ? "crosshair"
      : editor?.tool === "erase"
        ? "cell"
        : editor?.tool === "text"
          ? "text"
          : "default";

  return (
    <div
      style={{
        width,
        height: page.height * k,
        touchAction: editor && editor.tool !== "select" ? "none" : "auto",
        cursor,
      }}
    >
      <Stage
        ref={stageRef}
        width={page.width * k}
        height={page.height * k}
        scaleX={k}
        scaleY={k}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
      >
        <Layer listening={false}>
          <KImage image={paper} width={page.width} height={page.height} />
        </Layer>
        <Layer>
          {items.map((item) => {
            if (item.t === "s")
              return (
                <StickerNode
                  key={item.id}
                  item={item}
                  info={resolve(item.ref)}
                  editable={Boolean(editing)}
                  onSelect={onSelect}
                  onPut={onPut}
                  register={register}
                  onReady={bump}
                />
              );
            if (item.t === "t")
              return (
                <TapeNode
                  key={item.id}
                  item={item}
                  editable={Boolean(editing)}
                  onSelect={onSelect}
                  onPut={onPut}
                  register={register}
                  onReady={bump}
                />
              );
            if (item.t === "x")
              return (
                <TextNodeView
                  key={item.id}
                  item={item}
                  editable={Boolean(editing)}
                  onSelect={onSelect}
                  onPut={onPut}
                  register={register}
                />
              );
            if (erased.has(item.id)) return null;
            return <StrokeLine key={item.id} item={item} points={pointsOf(item)} />;
          })}
        </Layer>
        <Layer>
          {line && editor && (
            <StrokeLine
              item={{
                tool: editor.pen.tool,
                color: editor.pen.color,
                size: editor.pen.size,
              }}
              points={line}
              live
            />
          )}
          <Transformer
            ref={transformer}
            rotateEnabled
            anchorSize={12}
            anchorFill={SHEET}
            anchorStroke={PLUM}
            anchorStrokeWidth={2}
            anchorCornerRadius={0}
            borderStroke={PLUM}
            borderStrokeWidth={1.2}
            borderDash={[4, 4]}
            keepRatio={
              selected?.t === "s" || selected?.t === "t" ? selected.t === "s" : true
            }
            enabledAnchors={
              selected?.t === "t"
                ? ["middle-left", "middle-right", "top-center", "bottom-center"]
                : selected?.t === "x"
                  ? [
                      "top-left",
                      "top-right",
                      "bottom-left",
                      "bottom-right",
                      "middle-left",
                      "middle-right",
                    ]
                  : ["top-left", "top-right", "bottom-left", "bottom-right"]
            }
            boundBoxFunc={(oldBox, box) =>
              Math.abs(box.width) < 12 || Math.abs(box.height) < 8 ? oldBox : box
            }
          />
        </Layer>
      </Stage>
    </div>
  );
});
