import { useState, useRef, useEffect } from "react";
import { useImageCustom, getFitSize } from "../../utils/image";
import { Box, Stack, useMediaQuery } from "@mui/material";
import CropFreeIcon from "@mui/icons-material/CropFree";
import ChangeHistoryIcon from "@mui/icons-material/ChangeHistory";
import CropSquareIcon from "@mui/icons-material/CropSquare";
import StarIcon from "@mui/icons-material/Star";
import { useTheme } from "@mui/material/styles";
import {
  useShapeHandlers,
  getShapePoints,
  INITIAL_RECT,
  INITIAL_TRIANGLE,
  INITIAL_STAR,
} from "./shapeHandler/useShapeHandler";
import { useLassoDrawing } from "./hooks/useLassoDrawing";
import { useShapeTransform } from "./shapeHandler/useShapeTransform";
import LassoControls from "./LassoControls";
import PreviewBox from "./PreviewBox";

import styles from "./ImageLassoPanel.module.less";

const PANEL_SIZE = 500;

const SHAPES = [
  { value: "lasso", label: "Freehand", icon: <CropFreeIcon /> },
  { value: "triangle", label: "Triangle", icon: <ChangeHistoryIcon /> },
  { value: "rectangle", label: "Rectangle", icon: <CropSquareIcon /> },
  { value: "star", label: "Star", icon: <StarIcon /> },
];

const ImageLassoPanel = ({ onClose }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [imgNaturalWidth, setImgNaturalWidth] = useState(PANEL_SIZE);
  const [imgNaturalHeight, setImgNaturalHeight] = useState(PANEL_SIZE);
  const [confirmed, setConfirmed] = useState(false);
  const [borderColor, setBorderColor] = useState("#ffffff");
  const [borderWidth, setBorderWidth] = useState(5);
  const [stageImage] = useImageCustom(imageSrc, "anonymous");
  const [shapeType, setShapeType] = useState("lasso");
  const inputRef = useRef();

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

  // Shape states
  const {
    rectProps,
    setRectProps,
    triangleProps,
    setTriangleProps,
    starProps,
    setStarProps,
  } = useShapeHandlers(imageSrc);

  const {
    lassoPoints,
    setLassoPoints,
    setDrawing,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleRedo,
  } = useLassoDrawing({ imageSrc, confirmed, shapeType });

  const {
    limitRectDrag,
    handleRectTransform,
    limitTriangleDrag,
    handleTriangleTransform,
    limitStarDrag,
    handleStarTransform,
  } = useShapeTransform({
    rectRef,
    rectProps,
    setRectProps,
    triangleRef,
    triangleProps,
    setTriangleProps,
    starRef,
    starProps,
    setStarProps,
  });

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

  // --- Get shape points for masking (with rotation support) ---
  const getCurrentShapePoints = () =>
    getShapePoints(shapeType, rectProps, triangleProps, starProps, lassoPoints);
  const handleRedoAll = () => {
    setConfirmed(false);
    setLassoPoints([]);
    if (shapeType === "rectangle") setRectProps(INITIAL_RECT);
    if (shapeType === "triangle") setTriangleProps(INITIAL_TRIANGLE);
    if (shapeType === "star") setStarProps(INITIAL_STAR);
    handleRedo(); // still clears lassoPoints for lasso
  };

  const handleConfirm = () => {
    setConfirmed(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);

      // Get natural size
      const img = new window.Image();
      img.onload = () => {
        setImgNaturalWidth(img.naturalWidth);
        setImgNaturalHeight(img.naturalHeight);
      };
      img.src = url;
    }
    setConfirmed(false);
    setLassoPoints([]);
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
          <PreviewBox
            imageSrc={imageSrc}
            confirmed={confirmed}
            fit={fit}
            stageImage={stageImage}
            shapeType={shapeType}
            setShapeType={setShapeType}
            SHAPES={SHAPES}
            isMobile={isMobile}
            lassoPoints={lassoPoints}
            getCurrentShapePoints={getCurrentShapePoints}
            borderColor={borderColor}
            borderWidth={borderWidth}
            imgNaturalWidth={imgNaturalWidth}
            imgNaturalHeight={imgNaturalHeight}
            inputRef={inputRef}
            handleImageUpload={handleImageUpload}
            setConfirmed={setConfirmed}
            setLassoPoints={setLassoPoints}
            handlePointerDown={handlePointerDown}
            handlePointerMove={handlePointerMove}
            handlePointerUp={handlePointerUp}
            rectRef={rectRef}
            rectTransformerRef={rectTransformerRef}
            rectProps={rectProps}
            setRectProps={setRectProps}
            limitRectDrag={limitRectDrag}
            handleRectTransform={handleRectTransform}
            triangleRef={triangleRef}
            triangleTransformerRef={triangleTransformerRef}
            triangleProps={triangleProps}
            setTriangleProps={setTriangleProps}
            limitTriangleDrag={limitTriangleDrag}
            handleTriangleTransform={handleTriangleTransform}
            starRef={starRef}
            starTransformerRef={starTransformerRef}
            starProps={starProps}
            setStarProps={setStarProps}
            limitStarDrag={limitStarDrag}
            handleStarTransform={handleStarTransform}
            styles={styles}
            PANEL_SIZE={PANEL_SIZE}
          />
        </Box>

        <Box sx={{ flex: 1, minWidth: 280 }}>
          <LassoControls
            imageSrc={imageSrc}
            confirmed={confirmed}
            shapeType={shapeType}
            lassoPoints={lassoPoints}
            getCurrentShapePoints={getCurrentShapePoints}
            handleConfirm={handleConfirm}
            handleRedoAll={handleRedoAll}
            inputRef={inputRef}
            borderColor={borderColor}
            setBorderColor={setBorderColor}
            borderWidth={borderWidth}
            setBorderWidth={setBorderWidth}
            styles={styles}
            onClose={onClose}
          />
        </Box>
      </Stack>
    </Box>
  );
};

export default ImageLassoPanel;
