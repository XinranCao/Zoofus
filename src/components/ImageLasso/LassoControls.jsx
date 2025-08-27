import { Box, Button, Stack, Typography, Input, Slider } from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import ReplayIcon from "@mui/icons-material/Replay";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const LassoControls = ({
  imageSrc,
  confirmed,
  shapeType,
  lassoPoints,
  getCurrentShapePoints,
  handleConfirm,
  handleRedoAll,
  inputRef,
  borderColor,
  setBorderColor,
  borderWidth,
  setBorderWidth,
  styles,
  onClose,
}) => {
  return (
    <>
      {!imageSrc ? (
        <Typography variant="body1" sx={{ mt: 2 }}>
          Click "Select an image" to begin.
        </Typography>
      ) : (
        <>
          {!confirmed ? (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<CheckCircleIcon />}
                disabled={
                  (shapeType === "lasso" && lassoPoints.length < 6) ||
                  (shapeType !== "lasso" && getCurrentShapePoints().length < 6)
                }
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
              <Typography variant="body2" color="text.secondary">
                {shapeType === "lasso"
                  ? 'Draw a lasso around the area you want to select. Click "Confirm" when done.'
                  : 'Move and resize the shape to mask the area. Click "Confirm" when done.'}
              </Typography>
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
                <Input
                  type="color"
                  value={borderColor}
                  onChange={(e) => setBorderColor(e.target.value)}
                  sx={{
                    width: 48,
                    height: 48,
                    p: 0,
                    border: "none",
                    bgcolor: "transparent",
                  }}
                />
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Border Width
                </Typography>
                <Slider
                  min={0}
                  max={50}
                  value={borderWidth}
                  onChange={(_, val) => setBorderWidth(val)}
                  valueLabelDisplay="auto"
                />
              </Box>
            </Stack>
          )}
        </>
      )}
      <Button
        variant="outlined"
        className={styles.closeButton}
        onClick={() => {
          if (typeof window !== "undefined") window.scrollTo(0, 0);
          if (typeof onClose === "function") onClose();
        }}
      >
        Close
      </Button>
    </>
  );
};

export default LassoControls;
