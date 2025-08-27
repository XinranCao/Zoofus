import { useState, useRef, useEffect } from "react";
import MaskedImage from "./MaskedImage";
import { useImageCustom, getFitSize } from "../../utils/image";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Line,
  Rect,
  RegularPolygon,
  Star,
  Transformer,
} from "react-konva";
import {
  Box,
  Button,
  Stack,
  IconButton,
  Typography,
  Slider,
  Input,
  MenuItem,
  Select,
  useMediaQuery,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import ReplayIcon from "@mui/icons-material/Replay";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import CropFreeIcon from "@mui/icons-material/CropFree";
import ChangeHistoryIcon from "@mui/icons-material/ChangeHistory";
import CropSquareIcon from "@mui/icons-material/CropSquare";
import StarIcon from "@mui/icons-material/Star";
import { useTheme } from "@mui/material/styles";
import styles from "./ImageLassoPanel.module.less";

const PANEL_SIZE = 500;

const SHAPES = [
  { value: "lasso", label: "Freehand", icon: <CropFreeIcon /> },
  { value: "triangle", label: "Triangle", icon: <ChangeHistoryIcon /> },
  { value: "rectangle", label: "Rectangle", icon: <CropSquareIcon /> },
  { value: "star", label: "Star", icon: <StarIcon /> },
];

const INITIAL_RECT = { x: 100, y: 100, width: 200, height: 150, rotation: 0 };
const INITIAL_TRIANGLE = { x: 150, y: 100, radius: 100, rotation: 0 };
const INITIAL_STAR = {
  x: 250,
  y: 250,
  numPoints: 5,
  innerRadius: 60,
  outerRadius: 120,
  rotation: 0,
};

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
  const [shapeType, setShapeType] = useState("lasso");
  const inputRef = useRef();

  // Shape states
  const [rectProps, setRectProps] = useState(INITIAL_RECT);
  const [triangleProps, setTriangleProps] = useState(INITIAL_TRIANGLE);
  const [starProps, setStarProps] = useState(INITIAL_STAR);

  // Transformer refs
  const rectRef = useRef();
  const rectTransformerRef = useRef();
  const triangleRef = useRef();
  const triangleTransformerRef = useRef();
  const starRef = useRef();
  const starTransformerRef = useRef();

  // Responsive
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Fit image to preview box
  const fit = getFitSize(
    imgNaturalWidth,
    imgNaturalHeight,
    PANEL_SIZE,
    PANEL_SIZE
  );

  // Reset shapes when image changes
  useEffect(() => {
    setRectProps(INITIAL_RECT);
    setTriangleProps(INITIAL_TRIANGLE);
    setStarProps(INITIAL_STAR);
  }, [imageSrc]);

  // Reset shapes and lasso when shapeType changes
  useEffect(() => {
    setRectProps(INITIAL_RECT);
    setTriangleProps(INITIAL_TRIANGLE);
    setStarProps(INITIAL_STAR);
    setLassoPoints([]);
    setDrawing(false);
  }, [shapeType]);

  // --- Drag/Resize Limiting ---
  // Rectangle (no clamping, allow overflow)
  const limitRectDrag = (pos) => {
    return { x: pos.x, y: pos.y };
  };
  const handleRectTransform = () => {
    const node = rectRef.current;
    let width = Math.max(20, node.width() * node.scaleX());
    let height = Math.max(20, node.height() * node.scaleY());
    let x = node.x();
    let y = node.y();
    let rotation = node.rotation();
    setRectProps({
      ...rectProps,
      x,
      y,
      width,
      height,
      rotation,
    });
    node.scaleX(1);
    node.scaleY(1);
  };

  // Triangle (RegularPolygon, no clamping)
  const limitTriangleDrag = (pos) => {
    return { x: pos.x, y: pos.y };
  };
  const handleTriangleTransform = () => {
    const node = triangleRef.current;
    let radius = Math.max(20, node.radius() * node.scaleX());
    let x = node.x();
    let y = node.y();
    let rotation = node.rotation();
    setTriangleProps({
      ...triangleProps,
      x,
      y,
      radius,
      rotation,
    });
    node.scaleX(1);
    node.scaleY(1);
  };

  // Star (no clamping)
  const limitStarDrag = (pos) => {
    return { x: pos.x, y: pos.y };
  };
  const handleStarTransform = () => {
    const node = starRef.current;
    let outerRadius = Math.max(20, node.outerRadius() * node.scaleX());
    let innerRadius = Math.max(10, node.innerRadius() * node.scaleY());
    let x = node.x();
    let y = node.y();
    let rotation = node.rotation();
    setStarProps({
      ...starProps,
      x,
      y,
      outerRadius,
      innerRadius,
      rotation,
    });
    node.scaleX(1);
    node.scaleY(1);
  };

  // --- Get shape points for masking (with rotation support) ---
  const getShapePoints = () => {
    switch (shapeType) {
      case "triangle": {
        // Triangle: fix initial orientation and rotation math
        const { x: tx, y: ty, radius: tradius, rotation: trot } = triangleProps;
        let tpoints = [];
        // Start at -90deg so triangle points up
        for (let i = 0; i < 3; i++) {
          let angle =
            (Math.PI * 2 * i) / 3 - Math.PI / 2 + (trot * Math.PI) / 180;
          tpoints.push(
            tx + tradius * Math.cos(angle),
            ty + tradius * Math.sin(angle)
          );
        }
        return tpoints;
      }
      case "rectangle": {
        const { x, y, width, height, rotation } = rectProps;
        const rad = ((rotation || 0) * Math.PI) / 180;
        // Four corners relative to top-left
        const corners = [
          { x: 0, y: 0 }, // top-left
          { x: width, y: 0 }, // top-right
          { x: width, y: height }, // bottom-right
          { x: 0, y: height }, // bottom-left
        ];
        return corners.flatMap((pt) => {
          const rx = pt.x * Math.cos(rad) - pt.y * Math.sin(rad);
          const ry = pt.x * Math.sin(rad) + pt.y * Math.cos(rad);
          return [x + rx, y + ry];
        });
      }
      case "star": {
        // Star: already correct
        const {
          x: sx,
          y: sy,
          numPoints,
          innerRadius,
          outerRadius,
          rotation: srot,
        } = starProps;
        let spoints = [];
        for (let i = 0; i < numPoints; i++) {
          let angle =
            (Math.PI * 2 * i) / numPoints -
            Math.PI / 2 +
            (srot * Math.PI) / 180;
          spoints.push(
            sx + outerRadius * Math.cos(angle),
            sy + outerRadius * Math.sin(angle)
          );
          angle += Math.PI / numPoints;
          spoints.push(
            sx + innerRadius * Math.cos(angle),
            sy + innerRadius * Math.sin(angle)
          );
        }
        return spoints;
      }
      default:
        return lassoPoints;
    }
  };

  // --- Drawing handlers ---
  const handlePointerDown = (e) => {
    if (!imageSrc || confirmed || shapeType !== "lasso") return;
    setDrawing(true);
    setLassoPoints(getPointerPosition(e));
  };

  const handlePointerMove = (e) => {
    if (!drawing || confirmed || shapeType !== "lasso") return;
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

  // --- Selection logic for Transformer ---
  useEffect(() => {
    if (
      shapeType === "rectangle" &&
      rectTransformerRef.current &&
      rectRef.current
    ) {
      rectTransformerRef.current.nodes([rectRef.current]);
      rectTransformerRef.current.getLayer().batchDraw();
    }
    if (
      shapeType === "triangle" &&
      triangleTransformerRef.current &&
      triangleRef.current
    ) {
      triangleTransformerRef.current.nodes([triangleRef.current]);
      triangleTransformerRef.current.getLayer().batchDraw();
    }
    if (shapeType === "star" && starTransformerRef.current && starRef.current) {
      starTransformerRef.current.nodes([starRef.current]);
      starTransformerRef.current.getLayer().batchDraw();
    }
  }, [shapeType, confirmed]);

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={4}
        alignItems="center"
      >
        <Box>
          <Stack direction="column" spacing={1} alignItems="center">
            <Box>
              {/* --- Shape selector at top of preview section --- */}
              {!imageSrc ? null : !confirmed ? (
                isMobile ? (
                  <Select
                    value={shapeType}
                    onChange={(e) => setShapeType(e.target.value)}
                    size="small"
                    sx={{
                      mb: 2,
                      background: "#fff",
                      borderRadius: 2,
                    }}
                  >
                    {SHAPES.map((s) => (
                      <MenuItem key={s.value} value={s.value}>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          {s.icon}
                          <Typography variant="caption" sx={{ ml: 1 }}>
                            {s.label}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                ) : (
                  <ToggleButtonGroup
                    value={shapeType}
                    exclusive
                    onChange={(_, val) => val && setShapeType(val)}
                    sx={{
                      mb: 2,
                      background: "#fff",
                      borderRadius: 2,
                    }}
                  >
                    {SHAPES.map((s) => (
                      <ToggleButton key={s.value} value={s.value} size="small">
                        {s.icon}
                        <Typography variant="caption" sx={{ ml: 1 }}>
                          {s.label}
                        </Typography>
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                )
              ) : null}
              {/* --- End shape selector --- */}
            </Box>
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
                        {shapeType === "lasso" && lassoPoints.length > 2 && (
                          <Line
                            points={lassoPoints}
                            stroke="#1976d2"
                            strokeWidth={2}
                            tension={0.5}
                            closed={false}
                          />
                        )}
                        {shapeType === "rectangle" && (
                          <>
                            <Rect
                              ref={rectRef}
                              {...rectProps}
                              fill="rgba(25, 118, 210, 0.1)"
                              stroke="#1976d2"
                              strokeWidth={2}
                              draggable
                              rotation={rectProps.rotation || 0}
                              onDragMove={(e) => {
                                setRectProps({
                                  ...rectProps,
                                  ...limitRectDrag(e.target.position()),
                                });
                              }}
                              onTransformEnd={handleRectTransform}
                              onClick={() => setShapeType("rectangle")}
                            />
                            <Transformer
                              ref={rectTransformerRef}
                              boundBoxFunc={(oldBox, newBox) => {
                                newBox.width = Math.max(20, newBox.width);
                                newBox.height = Math.max(20, newBox.height);
                                return newBox;
                              }}
                            />
                          </>
                        )}
                        {shapeType === "triangle" && (
                          <>
                            <RegularPolygon
                              ref={triangleRef}
                              x={triangleProps.x}
                              y={triangleProps.y}
                              sides={3}
                              radius={triangleProps.radius}
                              fill="rgba(25, 118, 210, 0.1)"
                              stroke="#1976d2"
                              strokeWidth={2}
                              rotation={triangleProps.rotation || 0}
                              draggable
                              onDragMove={(e) => {
                                setTriangleProps({
                                  ...triangleProps,
                                  ...limitTriangleDrag(e.target.position()),
                                });
                              }}
                              onTransformEnd={handleTriangleTransform}
                              onClick={() => setShapeType("triangle")}
                            />
                            <Transformer
                              ref={triangleTransformerRef}
                              boundBoxFunc={(oldBox, newBox) => {
                                newBox.width = Math.max(20, newBox.width);
                                newBox.height = Math.max(20, newBox.height);
                                return newBox;
                              }}
                            />
                          </>
                        )}
                        {shapeType === "star" && (
                          <>
                            <Star
                              ref={starRef}
                              x={starProps.x}
                              y={starProps.y}
                              numPoints={starProps.numPoints}
                              innerRadius={starProps.innerRadius}
                              outerRadius={starProps.outerRadius}
                              fill="rgba(25, 118, 210, 0.1)"
                              stroke="#1976d2"
                              strokeWidth={2}
                              rotation={starProps.rotation || 0}
                              draggable
                              onDragMove={(e) => {
                                setStarProps({
                                  ...starProps,
                                  ...limitStarDrag(e.target.position()),
                                });
                              }}
                              onTransformEnd={handleStarTransform}
                              onClick={() => setShapeType("star")}
                            />
                            <Transformer
                              ref={starTransformerRef}
                              boundBoxFunc={(oldBox, newBox) => {
                                newBox.width = Math.max(20, newBox.width);
                                newBox.height = Math.max(20, newBox.height);
                                return newBox;
                              }}
                            />
                          </>
                        )}
                      </Layer>
                    </Stage>
                  ) : (
                    <MaskedImage
                      src={imageSrc}
                      lassoPoints={
                        shapeType === "lasso" ? lassoPoints : getShapePoints()
                      }
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
          </Stack>
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
                    disabled={
                      (shapeType === "lasso" && lassoPoints.length < 6) ||
                      (shapeType !== "lasso" && getShapePoints().length < 6)
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
