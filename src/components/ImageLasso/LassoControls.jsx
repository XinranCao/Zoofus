import { useState } from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
  TextField,
  Slider,
  Popover,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import ReplayIcon from "@mui/icons-material/Replay";
import UndoIcon from "@mui/icons-material/Undo";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useImageLasso } from "./ImageLassoContext";
import { ChromePicker } from "react-color";

const LassoControls = () => {
  const {
    imageSrc,
    confirmed,
    shapes,
    lassoSelections,
    setShapes,
    setLassoSelections,
    handleConfirm,
    handleRedoAll,
    inputRef,
    borderColor,
    setBorderColor,
    borderWidth,
    setBorderWidth,
  } = useImageLasso();
  const { selectMode, setSelectMode } = useImageLasso();

  const [colorAnchor, setColorAnchor] = useState(null);

  const handleBorderWidthInput = (e) => {
    let val = Number(e.target.value);
    if (isNaN(val)) val = 0;
    val = Math.max(0, Math.min(100, val));
    setBorderWidth(val);
  };

  const handleColorButtonClick = (e) => {
    setColorAnchor(e.currentTarget);
  };

  const handleColorClose = () => {
    setColorAnchor(null);
  };

  return (
    <Box
      sx={{
        minHeight: 340,
        height: 340,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
      }}
    >
      {!imageSrc ? (
        <Typography variant="body1" sx={{ mt: 2 }}>
          Click "Select an image" to begin.
        </Typography>
      ) : (
        <>
          {!confirmed ? (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <ToggleButtonGroup
                value={selectMode}
                exclusive
                onChange={(_, val) => {
                  if (val) setSelectMode(val);
                }}
                sx={{ mb: 1 }}
              >
                <ToggleButton value="select">Select</ToggleButton>
                <ToggleButton value="deselect">Deselect</ToggleButton>
              </ToggleButtonGroup>
              <Button
                variant="contained"
                color="primary"
                startIcon={<CheckCircleIcon />}
                disabled={shapes.length === 0 && lassoSelections.length === 0}
                onClick={handleConfirm}
              >
                Confirm Selection
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<PhotoCameraIcon />}
                onClick={() => {
                  if (inputRef.current) inputRef.current.value = null;
                  if (inputRef.current) inputRef.current.click();
                }}
              >
                Choose Another Image
              </Button>
              {/* <Button
                variant="outlined"
                color="secondary"
                startIcon={<UndoIcon />}
                onClick={handleRedoLast}
                disabled={shapes.length === 0 && lassoSelections.length === 0}
              >
                Redo Last
              </Button> */}
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<ReplayIcon />}
                onClick={handleRedoAll}
              >
                Redo
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<PhotoCameraIcon />}
                onClick={() => {
                  if (inputRef.current) inputRef.current.value = null;
                  if (inputRef.current) inputRef.current.click();
                }}
              >
                Choose Another Image
              </Button>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Border Color
                </Typography>
                <Button
                  variant="outlined"
                  sx={{
                    minWidth: 40,
                    width: 40,
                    height: 40,
                    p: 0,
                    border: "2px solid #ccc",
                    background: borderColor,
                  }}
                  onClick={handleColorButtonClick}
                />
                <Popover
                  open={Boolean(colorAnchor)}
                  anchorEl={colorAnchor}
                  onClose={handleColorClose}
                  anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                >
                  <Box sx={{ p: 2 }}>
                    <ChromePicker
                      color={borderColor}
                      onChange={(color) => setBorderColor(color.hex)}
                      disableAlpha
                    />
                  </Box>
                </Popover>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Border Width
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Slider
                    min={0}
                    max={100}
                    value={borderWidth}
                    onChange={(_, val) => setBorderWidth(val)}
                    valueLabelDisplay="auto"
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    type="number"
                    size="small"
                    value={borderWidth}
                    onChange={handleBorderWidthInput}
                    slotProps={{
                      input: {
                        min: 0,
                        max: 100,
                      },
                    }}
                    sx={{ width: 70 }}
                  />
                </Box>
              </Box>
            </Stack>
          )}
        </>
      )}
    </Box>
  );
};

export default LassoControls;
