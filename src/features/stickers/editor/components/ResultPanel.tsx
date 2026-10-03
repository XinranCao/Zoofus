import DownloadIcon from "@mui/icons-material/Download";
import SaveIcon from "@mui/icons-material/Save";
import { Alert, Box, Button, Slider, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { ChromePicker } from "react-color";
import { useSaveSticker } from "@/features/stickers/library/useStickers";
import { MAX_STICKER_NAME } from "@/features/stickers/library/sticker.schema";
import { computeMaskPolygons, isMaskEmpty } from "../domain/mask";
import { renderCutout } from "../domain/render";
import { useEditor } from "../store/editorStore";
import { useEditorImage } from "../useEditorImage";
import { ImagePicker } from "./ImagePicker";

/** Renders the cut-out to a transparent PNG; exposes the blob and a URL for preview + download. */
function useCutout() {
  const { image, fit } = useEditorImage();
  const selections = useEditor((s) => s.selections);
  const border = useEditor((s) => s.border);
  const [result, setResult] = useState<{ url: string; blob: Blob } | null>(null);

  const canvas = useMemo(() => {
    if (!image) return null;
    const mask = computeMaskPolygons(selections, fit, {
      width: image.naturalWidth,
      height: image.naturalHeight,
    });
    return isMaskEmpty(mask) ? null : renderCutout(image, mask, border);
  }, [image, fit, selections, border]);

  useEffect(() => {
    if (!canvas) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    canvas.toBlob((blob) => {
      if (!blob || cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setResult({ url: objectUrl, blob });
    }, "image/png");
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [canvas]);

  if (!canvas || !result) return null;
  return { ...result, width: canvas.width, height: canvas.height };
}

export function ResultPanel() {
  const cutout = useCutout();
  const url = cutout?.url ?? null;
  const border = useEditor((s) => s.border);
  const { setBorder, backToEdit, clear } = useEditor((s) => s);
  const [name, setName] = useState("My sticker");
  const save = useSaveSticker();
  const trimmed = name.trim();

  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={4} alignItems="center">
      <Box
        sx={{
          width: 500,
          maxWidth: "100%",
          height: 500,
          display: "grid",
          placeItems: "center",
        }}
      >
        {url ? (
          <img
            src={url}
            alt="Cut-out sticker preview"
            style={{ maxWidth: "100%", maxHeight: "100%" }}
          />
        ) : (
          <Typography color="text.secondary">
            Nothing selected inside the image.
          </Typography>
        )}
      </Box>
      <Stack spacing={2} sx={{ flex: 1, minWidth: 280 }}>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          component="a"
          href={url ?? undefined}
          download="zoofus-sticker.png"
          disabled={!url}
        >
          Download PNG
        </Button>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            label="Sticker name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            slotProps={{ htmlInput: { maxLength: MAX_STICKER_NAME } }}
            sx={{ flex: 1 }}
          />
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!cutout || !trimmed || save.isPending}
            onClick={() =>
              cutout &&
              save.mutate({
                blob: cutout.blob,
                name: trimmed,
                width: cutout.width,
                height: cutout.height,
              })
            }
          >
            Save
          </Button>
        </Stack>
        {save.isSuccess && <Alert severity="success">Saved to My Stickers.</Alert>}
        {save.isError && (
          <Alert severity="error">Could not save the sticker. Try again.</Alert>
        )}
        <Button variant="outlined" onClick={backToEdit}>
          Back to Editing
        </Button>
        <Button
          variant="outlined"
          onClick={() => {
            clear();
            backToEdit();
          }}
        >
          Start Over
        </Button>
        <ImagePicker variant="outlined">Choose Another Image</ImagePicker>
        <Box>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Border Color
          </Typography>
          <ChromePicker
            color={border.color}
            onChange={(c) => setBorder({ color: c.hex })}
            disableAlpha
          />
        </Box>
        <Box>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Border Width
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Slider
              min={0}
              max={100}
              value={border.width}
              onChange={(_, v) => setBorder({ width: v })}
              valueLabelDisplay="auto"
              aria-label="Border width"
            />
            <TextField
              type="number"
              size="small"
              value={border.width}
              onChange={(e) =>
                setBorder({
                  width: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                })
              }
              sx={{ width: 80 }}
            />
          </Stack>
        </Box>
      </Stack>
    </Stack>
  );
}
