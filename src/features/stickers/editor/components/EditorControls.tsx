import ChangeHistoryIcon from "@mui/icons-material/ChangeHistory";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CropFreeIcon from "@mui/icons-material/CropFree";
import CropSquareIcon from "@mui/icons-material/CropSquare";
import DeleteIcon from "@mui/icons-material/Delete";
import RedoIcon from "@mui/icons-material/Redo";
import ReplayIcon from "@mui/icons-material/Replay";
import StarIcon from "@mui/icons-material/Star";
import UndoIcon from "@mui/icons-material/Undo";
import {
  Button,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";
import { useShallow } from "zustand/react/shallow";
import { createShape } from "../domain/geometry";
import type { Tool } from "../domain/types";
import { useEditor } from "../store/editorStore";
import { ImagePicker } from "./ImagePicker";

const TOOLS: { value: Tool; label: string; icon: ReactNode }[] = [
  { value: "freehand", label: "Freehand", icon: <CropFreeIcon /> },
  { value: "triangle", label: "Triangle", icon: <ChangeHistoryIcon /> },
  { value: "rectangle", label: "Rectangle", icon: <CropSquareIcon /> },
  { value: "star", label: "Star", icon: <StarIcon /> },
];

export function EditorControls() {
  const tool = useEditor((s) => s.tool);
  const mode = useEditor((s) => s.mode);
  const selections = useEditor((s) => s.selections);
  const activeId = useEditor((s) => s.activeId);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const { setTool, setMode, addSelection, removeSelection, undo, redo, clear, confirm } =
    useEditor(
      useShallow((s) => ({
        setTool: s.setTool,
        setMode: s.setMode,
        addSelection: s.addSelection,
        removeSelection: s.removeSelection,
        undo: s.undo,
        redo: s.redo,
        clear: s.clear,
        confirm: s.confirm,
      })),
    );

  return (
    <Stack spacing={2}>
      <ToggleButtonGroup
        value={tool}
        exclusive
        size="small"
        onChange={(_, value: Tool | null) => value && setTool(value)}
      >
        {TOOLS.map((t) => (
          <ToggleButton key={t.value} value={t.value} aria-label={t.label}>
            {t.icon}
            <Typography variant="caption" sx={{ ml: 1 }}>
              {t.label}
            </Typography>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={(_, value: "select" | "deselect" | null) => value && setMode(value)}
      >
        <ToggleButton value="select">Select</ToggleButton>
        <ToggleButton value="deselect">Deselect</ToggleButton>
      </ToggleButtonGroup>

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <Button
          variant="outlined"
          size="small"
          disabled={tool === "freehand"}
          onClick={() =>
            tool !== "freehand" &&
            addSelection(createShape(tool, mode, crypto.randomUUID()))
          }
        >
          Add Shape
        </Button>
        <Button
          variant="outlined"
          color="error"
          size="small"
          startIcon={<DeleteIcon />}
          disabled={!activeId}
          onClick={() => activeId && removeSelection(activeId)}
        >
          Delete
        </Button>
        <Button size="small" startIcon={<UndoIcon />} disabled={!canUndo} onClick={undo}>
          Undo
        </Button>
        <Button size="small" startIcon={<RedoIcon />} disabled={!canRedo} onClick={redo}>
          Redo
        </Button>
        <Button
          size="small"
          startIcon={<ReplayIcon />}
          disabled={selections.length === 0}
          onClick={clear}
        >
          Clear
        </Button>
      </Stack>

      <Button
        variant="contained"
        startIcon={<CheckCircleIcon />}
        disabled={selections.length === 0}
        onClick={confirm}
      >
        Confirm Selection
      </Button>
      <ImagePicker variant="outlined">Choose Another Image</ImagePicker>
    </Stack>
  );
}
