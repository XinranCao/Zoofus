import { useState, useRef } from "react";
import MaskedImage from "./MaskedImage";
import { useImageCustom, getFitSize } from "../../utils/image";
import { Stage, Layer, Image as KonvaImage, Line } from "react-konva";
import {
  Box,
  Button,
  Stack,
  IconButton,
  Typography,
  Slider,
  Input,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import ReplayIcon from "@mui/icons-material/Replay";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import styles from "./ImageLassoPanel.module.less";

const PANEL_SIZE = 500;

const ImageLassoPanel = ({ onClose }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [drawing, setDrawing] = useState(false);
  const [imgNaturalWidth, setImgNaturalWidth] = useState(PANEL_SIZE);
  const [imgNaturalHeight, setImgNaturalHeight] = useState(PANEL_SIZE);
  const [lassoPoints, setLassoPoints] = useState([]);
  const [confirmed, setConfirmed] = useState(false);
  const [borderColor, setBorderColor] = useState("#fff");
  const [borderWidth, setBorderWidth] = useState(5);
  const [stageImage] = useImageCustom(imageSrc, "anonymous");
  const inputRef = useRef();

  const fit = getFitSize(
    imgNaturalWidth,
    imgNaturalHeight,
    PANEL_SIZE,
    PANEL_SIZE
  );

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) setImageSrc(URL.createObjectURL(file));
    setConfirmed(false);
    setLassoPoints([]);
  };

  const getPointerPosition = (e) => {
    if (e.evt.touches && e.evt.touches.length > 0) {
      const rect = e.target.getStage().container().getBoundingClientRect();
      const x = e.evt.touches[0].clientX - rect.left;
      const y = e.evt.touches[0].clientY - rect.top;
      return [x, y];
    } else {
      return [e.evt.layerX, e.evt.layerY];
    }
  };

  const handlePointerDown = (e) => {
    if (!imageSrc || confirmed) return;
    setDrawing(true);
    setLassoPoints(getPointerPosition(e));
  };

  const handlePointerMove = (e) => {
    if (!drawing || confirmed) return;
    setLassoPoints((pts) => [...pts, ...getPointerPosition(e)]);
  };

  const handlePointerUp = () => {
    setDrawing(false);
  };

  const handleRedo = () => {
    setLassoPoints([]);
    setConfirmed(false);
  };

  const handleConfirm = () => {
    setConfirmed(true);
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={4}
        alignItems="center"
      >
        <Box className={styles.previewBox}>
          {!imageSrc ? (
            <Box sx={{ textAlign: "center", width: "100%" }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Preview
              </Typography>
              <IconButton
                color="primary"
                sx={{ fontSize: 48 }}
                onClick={() => inputRef.current && inputRef.current.click()}
              >
                <PhotoCameraIcon fontSize="inherit" />
              </IconButton>
              <Typography variant="body2" sx={{ mt: 2 }}>
                Select an image
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                width: PANEL_SIZE,
                height: PANEL_SIZE,
                position: "relative",
              }}
            >
              {!confirmed ? (
                <Stage
                  width={fit.width}
                  height={fit.height}
                  className={styles.stage}
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerMove}
                  onMouseUp={handlePointerUp}
                  onTouchStart={handlePointerDown}
                  onTouchMove={handlePointerMove}
                  onTouchEnd={handlePointerUp}
                  style={{ width: fit.width, height: fit.height }}
                >
                  <Layer>
                    {stageImage && (
                      <KonvaImage
                        image={stageImage}
                        width={fit.width}
                        height={fit.height}
                      />
                    )}
                    {lassoPoints.length > 2 && (
                      <Line
                        points={lassoPoints}
                        stroke="#1976d2"
                        strokeWidth={2}
                        tension={0.5}
                        closed={false}
                      />
                    )}
                  </Layer>
                </Stage>
              ) : (
                <MaskedImage
                  src={imageSrc}
                  lassoPoints={lassoPoints}
                  borderColor={borderColor}
                  borderWidth={borderWidth}
                  displayWidth={fit.width}
                  displayHeight={fit.height}
                  naturalWidth={imgNaturalWidth}
                  naturalHeight={imgNaturalHeight}
                />
              )}
            </Box>
          )}
          {/* Always render the hidden file input here */}
          <Input
            inputRef={inputRef}
            type="file"
            accept="image/*"
            sx={{ display: "none" }}
            onChange={(e) => {
              handleImageUpload(e);
              setConfirmed(false);
              setLassoPoints([]);
            }}
          />
        </Box>
        <Box sx={{ flex: 1, minWidth: 280 }}>
          {imageSrc && (
            <img
              src={imageSrc}
              alt=""
              style={{ display: "none" }}
              onLoad={(e) => {
                setImgNaturalWidth(e.target.naturalWidth);
                setImgNaturalHeight(e.target.naturalHeight);
              }}
            />
          )}
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
                    disabled={lassoPoints.length < 6}
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
                    Draw a lasso around the area you want to select. Click
                    "Confirm" when done.
                  </Typography>
                </Stack>
              ) : (
                <Stack spacing={2} sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<ReplayIcon />}
                    onClick={handleRedo}
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
            onClick={onClose}
          >
            Close
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export default ImageLassoPanel;
