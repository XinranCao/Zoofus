import { Box, Stack, Typography } from "@mui/material";
import { useEffect } from "react";
import { EditorCanvas } from "./components/EditorCanvas";
import { EditorControls } from "./components/EditorControls";
import { ImagePicker } from "./components/ImagePicker";
import { ResultPanel } from "./components/ResultPanel";
import { EditorStoreProvider, useEditor } from "./store/editorStore";
import { STAGE_SIZE } from "./useEditorImage";

function EditorBody() {
  const imageUrl = useEditor((s) => s.imageUrl);
  const view = useEditor((s) => s.view);

  // This component owns the object URL: revoke it when the image is replaced or the editor closes.
  useEffect(
    () => () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    },
    [imageUrl],
  );

  if (!imageUrl) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        spacing={2}
        sx={{ height: STAGE_SIZE }}
      >
        <Typography variant="h6">Pick a photo to start cutting</Typography>
        <ImagePicker variant="contained">Select an image</ImagePicker>
      </Stack>
    );
  }
  if (view === "result") return <ResultPanel />;
  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={4} alignItems="center">
      <Box
        sx={{
          width: STAGE_SIZE,
          maxWidth: "100%",
          minHeight: STAGE_SIZE,
          display: "grid",
          placeItems: "center",
        }}
      >
        <EditorCanvas />
      </Box>
      <Box sx={{ flex: 1, minWidth: 280 }}>
        <EditorControls />
      </Box>
    </Stack>
  );
}

/** The sticker maker: upload a photo, lasso what you want, export a cut-out PNG. */
export function StickerEditor() {
  return (
    <EditorStoreProvider>
      <EditorBody />
    </EditorStoreProvider>
  );
}
