/* The page is a custom widget: role=application with its own keyboard handling, focusable so shortcuts work. */
/* eslint-disable jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-static-element-interactions */
import type Konva from "konva";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { Dialog } from "@/components/ui/Dialog";
import { Paper } from "@/components/ui/Paper";
import { Select } from "@/components/ui/Select";
import { Slider } from "@/components/ui/Slider";
import { TextField } from "@/components/ui/TextField";
import { ToggleGroup } from "@/components/ui/ToggleGroup";
import { StickerPickerDialog } from "@/features/stickers/library/StickerPicker";
import type { Sticker } from "@/features/stickers/library/sticker.schema";
import { TapePickerDialog } from "@/features/tape/TapePickerDialog";
import type { TapeSpec } from "@/features/tape/tape.schema";
import { canvasToBlob } from "@/lib/image";
import { patternSpecSchema } from "@/paper/patternSchema";
import { useElementWidth } from "@/lib/useElementWidth";
import { FONTS } from "./fonts";
import {
  INK_COLORS,
  MAX_JOURNAL_ITEMS,
  MAX_TEXT,
  STICKER_BASE,
  STROKE_TOOLS,
  newId,
  type InkName,
  type Item,
  type StrokeTool,
} from "./journal.schema";
import { JournalCanvas, type StickerResolver } from "./JournalCanvas";
import { reorder, topZ } from "./ops";
import { PageSetup } from "./PageSetup";
import { useJournalState, useJournalStore, type JournalTool } from "./store/journalStore";

/** What the page can hand back: the whole page as a picture, and a small one for lists. */
export interface JournalExport {
  png: () => Promise<Blob>;
  thumb: () => Promise<Blob>;
}

const TOOLS: {
  tool: JournalTool;
  icon: "hand" | "pen" | "eraser" | "text";
  key: string;
}[] = [
  { tool: "select", icon: "hand", key: "select" },
  { tool: "text", icon: "text", key: "text" },
  { tool: "draw", icon: "pen", key: "draw" },
  { tool: "erase", icon: "eraser", key: "erase" },
];

const ZOOMS = [0.5, 0.75, 1, 1.5, 2, 3];

/**
 * The journal studio: a page in the middle, tools down the side, and a panel for whatever is
 * chosen. It edits through the journal store, so the same studio serves a journal of your own and
 * a page you make together with friends (the store reports every change as operations).
 */
export function JournalStudio({
  title,
  onTitle,
  resolve,
  onAddSticker,
  stickerPicker,
  tapePicker,
  header,
  aside,
  exportRef,
  backTo,
}: {
  title: string;
  onTitle?: (title: string) => void;
  resolve: StickerResolver;
  /** Bring one of your stickers onto the page; resolves to the pointer the item should hold. */
  onAddSticker?: (sticker: Sticker) => Promise<string>;
  /** Replace the sticker list (a shared page picks from its shelf): call `onPick` with the pointer to put on the page. */
  stickerPicker?: (p: {
    open: boolean;
    onClose: () => void;
    onPick: (ref: string) => void;
  }) => ReactNode;
  /** Replace the tape list (a shared page picks from its shelf). */
  tapePicker?: (p: {
    open: boolean;
    onClose: () => void;
    onPick: (tape: TapeSpec) => void;
  }) => ReactNode;
  /** Buttons for the top bar (Save, Download, ...). */
  header?: ReactNode;
  /** Extra content under the tools (who is here, who can edit). */
  aside?: ReactNode;
  exportRef?: Ref<JournalExport>;
  /** A link back to the list the journal came from. */
  backTo?: { to: string; label: string };
}) {
  const { t } = useTranslation();
  const store = useJournalStore();
  const page = useJournalState((s) => s.page);
  const items = useJournalState((s) => s.items);
  const selectedId = useJournalState((s) => s.selectedId);
  const tool = useJournalState((s) => s.tool);
  const pen = useJournalState((s) => s.pen);
  const text = useJournalState((s) => s.text);
  const canUndo = useJournalState((s) => s.past.length > 0);
  const canRedo = useJournalState((s) => s.future.length > 0);
  const selected = items.find((i) => i.id === selectedId) ?? null;

  const [stickerOpen, setStickerOpen] = useState(false);
  const [tapeOpen, setTapeOpen] = useState(false);
  const [paperOpen, setPaperOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [areaRef, areaWidth] = useElementWidth<HTMLDivElement>();
  const stage = useRef<Konva.Stage>(null);
  const full = items.length >= MAX_JOURNAL_ITEMS;

  // the whole page as a picture, and a small one
  useImperativeHandle(exportRef, () => {
    const grab = async (maxSide: number, quality: number, mime: string) => {
      const st = stage.current;
      if (!st) throw new Error("No page");
      store.getState().select(null); // no handles in the picture
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const k = st.scaleX();
      const ratio = Math.min(2, maxSide / (page.width * k) || 1);
      const canvas = st.toCanvas({ pixelRatio: ratio });
      return canvasToBlob(canvas, mime, quality);
    };
    return {
      png: () => grab(2000, 1, "image/png"),
      thumb: () => grab(480, 0.8, "image/webp"),
    };
  }, [store, page.width]);

  const apply = store.getState().apply;
  const patch = useCallback(
    (item: Item, change: Partial<Item>, coalesce?: string) =>
      store.getState().apply([{ k: "put", item: { ...item, ...change } as Item }], {
        coalesce: coalesce ?? `${item.id}:${Object.keys(change).join(",")}`,
      }),
    [store],
  );

  const placeAtCentre = () => ({ x: page.width / 2, y: page.height / 2 });

  const addRef = (ref: string) => {
    setStickerOpen(false);
    if (full) return;
    const id = newId();
    apply([
      {
        k: "put",
        item: {
          t: "s",
          id,
          ref,
          ...placeAtCentre(),
          r: 0,
          sc: Math.min(3, (page.width * 0.3) / STICKER_BASE),
          z: topZ(store.getState().items),
        },
      },
    ]);
    store.getState().setTool("select");
    store.getState().select(id);
  };
  const addSticker = async (sticker: Sticker) =>
    addRef((await onAddSticker?.(sticker)) ?? sticker.id);

  const addTape = (tape: TapeSpec) => {
    setTapeOpen(false);
    if (full) return;
    const id = newId();
    apply([
      {
        k: "put",
        item: {
          t: "t",
          id,
          ...placeAtCentre(),
          r: -8,
          z: topZ(store.getState().items),
          len: 160,
          tape: {
            pattern: patternSpecSchema.parse(tape.pattern),
            thickness: tape.thickness,
            opacity: tape.opacity,
            ends: tape.ends,
          },
        },
      },
    ]);
    store.getState().setTool("select");
    store.getState().select(id);
  };

  const duplicate = (item: Item) => {
    if (full) return;
    const id = newId();
    apply([
      {
        k: "put",
        item: {
          ...item,
          id,
          x: item.x + 28,
          y: item.y + 28,
          z: topZ(store.getState().items),
        },
      },
    ]);
    store.getState().select(id);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement;
    if (el.closest("input, textarea, select, [role=slider], [role=radio]")) return;
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (mod && key === "z") {
      e.preventDefault();
      return e.shiftKey ? store.getState().redo() : store.getState().undo();
    }
    if (mod && key === "y") {
      e.preventDefault();
      return store.getState().redo();
    }
    if (!selected) return;
    if (key === "delete" || key === "backspace") {
      e.preventDefault();
      return apply([{ k: "del", id: selected.id }]);
    }
    if (key === "escape") return store.getState().select(null);
    if (mod && key === "d") {
      e.preventDefault();
      return duplicate(selected);
    }
    const step = e.shiftKey ? 10 : 1;
    const move: Record<string, [number, number]> = {
      arrowleft: [-step, 0],
      arrowright: [step, 0],
      arrowup: [0, -step],
      arrowdown: [0, step],
    };
    const d = move[key];
    if (d && selected.t !== "p") {
      e.preventDefault();
      patch(
        selected,
        { x: selected.x + d[0], y: selected.y + d[1] },
        `${selected.id}:nudge`,
      );
    }
  };

  // Fit the whole page in view (both ways when the studio sits beside its tools; by width when
  // it is stacked on a phone), then zoom. Zoomed in, the area scrolls.
  const [view, setView] = useState({
    h: window.innerHeight,
    wide: window.innerWidth >= 1100,
  });
  useEffect(() => {
    const on = () => setView({ h: window.innerHeight, wide: window.innerWidth >= 1100 });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const room = Math.max(200, (areaWidth || 600) - 28);
  const fitByHeight = view.wide ? ((view.h - 300) * page.width) / page.height : room;
  const width = Math.max(200, Math.round(Math.min(room, fitByHeight) * zoom));

  const editor = useMemo(
    () => ({
      tool,
      selectedId,
      pen,
      text,
      onSelect: (id: string | null) => store.getState().select(id),
      onOps: (ops: Parameters<typeof apply>[0]) => store.getState().apply(ops),
    }),
    [tool, selectedId, pen, text, store],
  );

  return (
    <div className="zf-jstudio" onKeyDown={onKeyDown}>
      <div className="zf-jstudio__bar">
        {backTo && (
          <Link to={backTo.to} className="zf-backlink">
            {backTo.label}
          </Link>
        )}
        <div style={{ flex: "1 1 220px", minWidth: 180, maxWidth: 420 }}>
          {onTitle ? (
            <TextField
              label={t("journal.title")}
              hideLabel
              seed="jtitle"
              value={title}
              maxLength={80}
              onChange={(e) => onTitle(e.target.value)}
            />
          ) : (
            <h1 className="zf-h1" style={{ margin: 0 }}>
              {title}
            </h1>
          )}
        </div>
        <div className="zf-jstudio__barbtns">
          <Button
            variant="quiet"
            size="sm"
            icon="undo"
            seed="ju"
            disabled={!canUndo}
            onClick={() => store.getState().undo()}
          >
            {t("common.undo")}
          </Button>
          <Button
            variant="quiet"
            size="sm"
            icon="redo"
            seed="jr"
            disabled={!canRedo}
            onClick={() => store.getState().redo()}
          >
            {t("common.redo")}
          </Button>
          <Button
            variant="quiet"
            size="sm"
            icon="zoomOut"
            seed="jzo"
            aria-label={t("journal.zoomOut")}
            disabled={zoom <= ZOOMS[0]!}
            onClick={() => setZoom(ZOOMS[Math.max(0, ZOOMS.indexOf(zoom) - 1)]!)}
          />
          <Button
            variant="quiet"
            size="sm"
            seed="jzf"
            aria-label={t("journal.zoomFit")}
            onClick={() => setZoom(1)}
          >
            {Math.round(zoom * 100)}%
          </Button>
          <Button
            variant="quiet"
            size="sm"
            icon="zoomIn"
            seed="jzi"
            aria-label={t("journal.zoomIn")}
            disabled={zoom >= ZOOMS[ZOOMS.length - 1]!}
            onClick={() =>
              setZoom(ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(zoom) + 1)]!)
            }
          />
          <Button
            variant="secondary"
            size="sm"
            icon="journal"
            seed="jpp"
            onClick={() => setPaperOpen(true)}
          >
            {t("journal.paper")}
          </Button>
          {header}
        </div>
      </div>

      <div className="zf-jstudio__body">
        <div
          className="zf-jstudio__tools"
          role="toolbar"
          aria-label={t("journal.toolbar")}
          aria-orientation="vertical"
        >
          <Chip
            seed="jtsticker"
            icon="image"
            onClick={() => setStickerOpen(true)}
            disabled={full}
          >
            {t("journal.tools.sticker")}
          </Chip>
          <Chip
            seed="jttape"
            icon="tape"
            onClick={() => setTapeOpen(true)}
            disabled={full}
          >
            {t("journal.tools.tape")}
          </Chip>
          {TOOLS.map((x) => (
            <Chip
              key={x.tool}
              seed={"jt" + x.tool}
              icon={x.icon}
              selected={tool === x.tool}
              onClick={() => store.getState().setTool(x.tool)}
            >
              {t(`journal.tools.${x.key}`)}
            </Chip>
          ))}
          {aside}
        </div>

        <div className="zf-jstudio__area" ref={areaRef}>
          {/* the page is a custom widget: it takes focus so its keyboard shortcuts work */}
          <div
            className="zf-jstudio__page"
            tabIndex={0}
            role="application"
            aria-label={t("journal.pageLabel")}
          >
            {areaWidth > 0 && (
              <JournalCanvas
                page={page}
                items={items}
                resolve={resolve}
                width={width}
                editor={editor}
                stageRef={stage}
              />
            )}
          </div>
        </div>

        <div className="zf-jstudio__panel">
          {tool === "draw" || tool === "erase" ? (
            <PenPanel />
          ) : selected ? (
            <ItemPanel item={selected} patch={patch} duplicate={duplicate} full={full} />
          ) : tool === "text" ? (
            <Paper
              seed="jhint"
              size="sm"
              tone="scrap-warm"
              rotate={0.4}
              faceStyle={{ padding: "16px 18px" }}
            >
              <p style={{ margin: 0 }}>{t("journal.hint.text")}</p>
            </Paper>
          ) : (
            <Paper
              seed="jhint2"
              size="sm"
              tone="scrap-warm"
              rotate={0.4}
              faceStyle={{ padding: "16px 18px" }}
            >
              <p style={{ margin: 0 }}>{t("journal.hint.select")}</p>
              {full && <p style={{ margin: "8px 0 0" }}>{t("journal.full")}</p>}
            </Paper>
          )}
        </div>
      </div>

      {stickerPicker ? (
        stickerPicker({
          open: stickerOpen,
          onClose: () => setStickerOpen(false),
          onPick: addRef,
        })
      ) : (
        <StickerPickerDialog
          open={stickerOpen}
          onClose={() => setStickerOpen(false)}
          onPick={(s) => void addSticker(s)}
          title={t("journal.pickSticker")}
        />
      )}
      {tapePicker ? (
        tapePicker({ open: tapeOpen, onClose: () => setTapeOpen(false), onPick: addTape })
      ) : (
        <TapePickerDialog
          open={tapeOpen}
          onClose={() => setTapeOpen(false)}
          onPick={addTape}
        />
      )}
      <Dialog
        open={paperOpen}
        onOpenChange={setPaperOpen}
        width={560}
        sheet
        seed="jpaper"
        tapes={1}
        title={t("journal.paper")}
        actions={
          <Button
            variant="primary"
            icon="check"
            seed="jpaperok"
            onClick={() => setPaperOpen(false)}
          >
            {t("bulk.done")}
          </Button>
        }
      >
        <div style={{ margin: "10px 0 6px" }}>
          <PageSetup value={page} onChange={(p) => apply([{ k: "page", page: p }])} />
        </div>
      </Dialog>
    </div>
  );
}

// -------------------------------------------------------------------- panels

function PenPanel() {
  const { t } = useTranslation();
  const store = useJournalStore();
  const pen = useJournalState((s) => s.pen);
  const tool = useJournalState((s) => s.tool);
  return (
    <Paper
      seed="jpen"
      size="sm"
      tone="scrap"
      rotate={0.3}
      faceStyle={{ padding: "18px 18px 20px" }}
    >
      <div style={{ display: "grid", gap: 16 }}>
        {tool === "erase" ? (
          <p style={{ margin: 0 }}>{t("journal.hint.erase")}</p>
        ) : (
          <>
            <ToggleGroup<StrokeTool>
              label={t("journal.pen.tool")}
              seed="jpt"
              value={pen.tool}
              options={STROKE_TOOLS.map((p) => ({
                value: p,
                label: t(`journal.pen.tools.${p}`),
              }))}
              onChange={(v) => store.getState().setPen({ tool: v })}
            />
            <div>
              <div className="zf-label" style={{ marginBottom: 8 }}>
                {t("journal.pen.colour")}
              </div>
              <ColorPicker
                label={t("journal.pen.colour")}
                colors={INK_COLORS}
                columns={6}
                value={pen.color}
                onChange={(c) => store.getState().setPen({ color: c as InkName })}
              />
            </div>
          </>
        )}
        <Slider
          label={tool === "erase" ? t("journal.pen.eraser") : t("journal.pen.size")}
          value={pen.size}
          min={1}
          max={40}
          unit=" px"
          seed="jps"
          onChange={(size) => store.getState().setPen({ size })}
        />
      </div>
    </Paper>
  );
}

function ItemPanel({
  item,
  patch,
  duplicate,
  full,
}: {
  item: Item;
  patch: (item: Item, change: Partial<Item>, coalesce?: string) => void;
  duplicate: (item: Item) => void;
  full: boolean;
}) {
  const { t } = useTranslation();
  const store = useJournalStore();
  const items = useJournalState((s) => s.items);
  return (
    <Paper
      seed={"jitem" + item.t}
      size="sm"
      tone="scrap"
      rotate={0.3}
      faceStyle={{ padding: "18px 18px 20px" }}
    >
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          <Button
            variant="quiet"
            size="sm"
            icon="front"
            seed="jfront"
            onClick={() => store.getState().apply(reorder(items, item.id, "front"))}
          >
            {t("journal.item.front")}
          </Button>
          <Button
            variant="quiet"
            size="sm"
            icon="back"
            seed="jback"
            onClick={() => store.getState().apply(reorder(items, item.id, "back"))}
          >
            {t("journal.item.back")}
          </Button>
          {item.t !== "p" && (
            <Button
              variant="quiet"
              size="sm"
              icon="copy"
              seed="jdup"
              disabled={full}
              onClick={() => duplicate(item)}
            >
              {t("journal.item.duplicate")}
            </Button>
          )}
          <Button
            variant="quiet"
            size="sm"
            icon="trash"
            seed="jdel"
            onClick={() => store.getState().apply([{ k: "del", id: item.id }])}
          >
            {t("common.delete")}
          </Button>
        </div>

        {item.t !== "p" && (
          <Slider
            label={t("journal.item.rotation")}
            value={Math.round(((item.r % 360) + 540) % 360) - 180}
            min={-180}
            max={180}
            unit="°"
            seed="jrot"
            onChange={(r) => patch(item, { r })}
          />
        )}

        {item.t === "s" && (
          <Slider
            label={t("journal.item.size")}
            value={Math.round(item.sc * 100)}
            min={10}
            max={600}
            unit="%"
            seed="jsc"
            onChange={(v) => patch(item, { sc: v / 100 })}
          />
        )}
        {item.t === "s" && item.sy !== undefined && (
          <div>
            <Button
              variant="quiet"
              size="sm"
              icon="reset"
              seed="junstretch"
              onClick={() => patch(item, { sy: undefined })}
            >
              {t("journal.item.unstretch")}
            </Button>
          </div>
        )}

        {item.t === "t" && (
          <>
            <Slider
              label={t("journal.item.length")}
              value={Math.round(item.len)}
              min={40}
              max={800}
              unit=" px"
              seed="jlen"
              onChange={(len) => patch(item, { len })}
            />
            <Slider
              label={t("journal.item.width")}
              value={Math.round(item.tape.thickness)}
              min={12}
              max={36}
              unit=" px"
              seed="jthick"
              onChange={(thickness) => patch(item, { tape: { ...item.tape, thickness } })}
            />
          </>
        )}

        {item.t === "x" && (
          <>
            <TextField
              label={t("journal.item.text")}
              seed="jtext"
              multiline
              rows={3}
              maxLength={MAX_TEXT}
              value={item.text}
              placeholder={t("journal.item.textPlaceholder")}
              onChange={(e) => patch(item, { text: e.target.value }, `${item.id}:text`)}
              // eslint-disable-next-line jsx-a11y/no-autofocus -- a new text box is typed into straight away
              autoFocus={item.text === ""}
            />
            <div>
              <div className="zf-label" style={{ marginBottom: 8 }}>
                {t("journal.item.font")}
              </div>
              <Select
                label={t("journal.item.font")}
                seed="jfont"
                value={item.font}
                groupLabels={
                  t("journal.fonts.groups", {
                    returnObjects: true,
                  }) as Record<string, string>
                }
                options={FONTS.map((f) => ({
                  value: f.key,
                  label: t(`journal.fonts.${f.key}`),
                  group: f.group,
                  style: { fontFamily: f.family },
                }))}
                onChange={(font) => {
                  patch(item, { font });
                  store.getState().setText({ font });
                }}
              />
            </div>
            <Slider
              label={t("journal.item.fontSize")}
              value={Math.round(item.size)}
              min={10}
              max={200}
              unit=" px"
              seed="jfs"
              onChange={(size) => {
                patch(item, { size });
                store.getState().setText({ size });
              }}
            />
            <div
              style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
            >
              <Chip
                seed="jbold"
                icon="bold"
                selected={Boolean(item.bold)}
                onClick={() => {
                  patch(item, { bold: item.bold ? undefined : true });
                  store.getState().setText({ bold: !item.bold });
                }}
              >
                {t("journal.item.bold")}
              </Chip>
            </div>
            <div>
              <div className="zf-label" style={{ marginBottom: 8 }}>
                {t("journal.pen.colour")}
              </div>
              <ColorPicker
                label={t("journal.pen.colour")}
                colors={INK_COLORS}
                columns={6}
                value={item.color}
                onChange={(color) => {
                  patch(item, { color: color as InkName });
                  store.getState().setText({ color: color as InkName });
                }}
              />
            </div>
          </>
        )}
      </div>
    </Paper>
  );
}
