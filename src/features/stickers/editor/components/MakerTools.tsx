import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Scribble";
import { ToggleGroup } from "@/components/ui/ToggleGroup";
import { Tooltip } from "@/components/ui/Tooltip";
import { createShape } from "../domain/geometry";
import type { Tool } from "../domain/types";
import { useEditor } from "../store/editorStore";

const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl+";

/** Mode (Select / Deselect), Shape toggles, and quiet Undo / Redo / Delete / Reset buttons. */
export function MakerTools({ disabled }: { disabled?: boolean }) {
  const { t } = useTranslation();
  const tool = useEditor((s) => s.tool);
  const mode = useEditor((s) => s.mode);
  const activeId = useEditor((s) => s.activeId);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const hasSelections = useEditor((s) => s.selections.length > 0);
  const setTool = useEditor((s) => s.setTool);
  const setMode = useEditor((s) => s.setMode);
  const addSelection = useEditor((s) => s.addSelection);
  const removeSelection = useEditor((s) => s.removeSelection);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const clear = useEditor((s) => s.clear);

  return (
    <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
      <div>
        <div className="zf-label" style={{ marginBottom: 8 }}>
          {t("maker.mode")}
        </div>
        <ToggleGroup
          label={t("maker.mode")}
          seed="mode"
          value={mode}
          disabled={disabled}
          onChange={setMode}
          options={[
            { value: "select", label: t("maker.select"), icon: "plus" },
            { value: "deselect", label: t("maker.deselect"), icon: "minus" },
          ]}
        />
      </div>
      <div>
        <div className="zf-label" style={{ marginBottom: 8 }}>
          {t("maker.shape")}
        </div>
        <ToggleGroup<Tool>
          label={t("maker.shape")}
          seed="shape"
          value={tool}
          disabled={disabled}
          onChange={setTool}
          options={[
            { value: "freehand", label: t("maker.shapes.freehand"), icon: "lasso" },
            { value: "triangle", label: t("maker.shapes.triangle"), icon: "tri" },
            { value: "rectangle", label: t("maker.shapes.rectangle"), icon: "rect" },
            { value: "star", label: t("maker.shapes.star"), icon: "star" },
          ]}
        />
        {tool !== "freehand" && (
          <div style={{ marginTop: 10 }}>
            <Button
              variant="secondary"
              size="sm"
              icon="plus"
              seed="addshape"
              disabled={disabled}
              onClick={() => addSelection(createShape(tool, mode, crypto.randomUUID()))}
            >
              {t("maker.addShape")}
            </Button>
          </div>
        )}
      </div>
      <Divider seed="tools" />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        <Tooltip label={`${t("common.undo")} (${MOD}Z)`}>
          <Button
            variant="quiet"
            size="sm"
            icon="undo"
            seed="u"
            disabled={disabled || !canUndo}
            onClick={undo}
          >
            {t("common.undo")}
          </Button>
        </Tooltip>
        <Tooltip label={`${t("common.redo")} (⇧${MOD}Z)`}>
          <Button
            variant="quiet"
            size="sm"
            icon="redo"
            seed="r"
            disabled={disabled || !canRedo}
            onClick={redo}
          >
            {t("common.redo")}
          </Button>
        </Tooltip>
        <Tooltip label={`${t("common.delete")} (Del)`}>
          <Button
            variant="quiet"
            size="sm"
            icon="trash"
            seed="d"
            disabled={disabled || !activeId}
            onClick={() => activeId && removeSelection(activeId)}
          >
            {t("common.delete")}
          </Button>
        </Tooltip>
        <Button
          variant="quiet"
          size="sm"
          icon="reset"
          seed="rs"
          disabled={disabled || !hasSelections}
          onClick={clear}
        >
          {t("common.reset")}
        </Button>
      </div>
    </div>
  );
}
