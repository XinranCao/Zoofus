import CloseIcon from "@mui/icons-material/Close";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";
import {
  TransformComponent,
  TransformWrapper,
  useControls,
  useTransformEffect,
} from "react-zoom-pan-pinch";
import type { Sticker } from "./sticker.schema";

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 8;

/** Zoom buttons plus the current zoom level; must render inside <TransformWrapper>. */
function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const [scale, setScale] = useState(1);
  useTransformEffect(({ state }) => setScale(state.scale));

  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      justifyContent="center"
      sx={{ pt: 1 }}
    >
      <IconButton
        aria-label="Zoom out"
        onClick={() => zoomOut()}
        disabled={scale <= MIN_ZOOM + 1e-6}
      >
        <ZoomOutIcon />
      </IconButton>
      <Typography
        component="output"
        aria-live="polite"
        sx={{ minWidth: 56, textAlign: "center" }}
      >
        {Math.round(scale * 100)}%
      </Typography>
      <IconButton
        aria-label="Zoom in"
        onClick={() => zoomIn()}
        disabled={scale >= MAX_ZOOM - 1e-6}
      >
        <ZoomInIcon />
      </IconButton>
      <Button size="small" onClick={() => resetTransform()}>
        Reset
      </Button>
    </Stack>
  );
}

// A checkerboard so transparent areas of the sticker are visible.
const CHECKERBOARD = {
  backgroundColor: "#f4f4f4",
  backgroundImage:
    "linear-gradient(45deg, #e2e2e2 25%, transparent 25%), linear-gradient(-45deg, #e2e2e2 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e2e2 75%), linear-gradient(-45deg, transparent 75%, #e2e2e2 75%)",
  backgroundSize: "20px 20px",
  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0",
} as const;

interface Props {
  sticker: Sticker | null;
  onClose: () => void;
}

/**
 * Full-size sticker preview. Zoom with the buttons, the mouse wheel, double click, or a
 * two-finger pinch; drag to move around when zoomed in. Escape or the close button closes it.
 */
export function StickerPreviewDialog({ sticker, onClose }: Props) {
  return (
    <Dialog open={sticker !== null} onClose={onClose} fullWidth maxWidth="md">
      {sticker && (
        <>
          <DialogTitle sx={{ display: "flex", alignItems: "center", pr: 1 }}>
            <Typography
              component="span"
              variant="h6"
              noWrap
              sx={{ flex: 1, minWidth: 0 }}
            >
              {sticker.name}
            </Typography>
            <IconButton aria-label="Close preview" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {/* Keyed so each sticker opens at 100% */}
            <TransformWrapper
              key={sticker.id}
              minScale={MIN_ZOOM}
              maxScale={MAX_ZOOM}
              initialScale={1}
              centerOnInit
              doubleClick={{ mode: "toggle", step: 2 }}
              wheel={{ step: 0.15 }}
            >
              <Box
                sx={{
                  ...CHECKERBOARD,
                  borderRadius: 1,
                  overflow: "hidden",
                  touchAction: "none",
                }}
              >
                <TransformComponent
                  wrapperStyle={{ width: "100%", height: "min(60vh, 520px)" }}
                  contentStyle={{
                    width: "100%",
                    height: "100%",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <img
                    src={sticker.imageUrl}
                    alt={sticker.name}
                    draggable={false}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "min(60vh, 520px)",
                      display: "block",
                    }}
                  />
                </TransformComponent>
              </Box>
              <ZoomControls />
            </TransformWrapper>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
}
