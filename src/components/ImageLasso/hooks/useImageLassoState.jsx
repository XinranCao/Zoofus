import { useState, useRef, useEffect, useMemo } from "react";
import { useImageCustom, getFitSize } from "../../../utils/image";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";
import CropFreeIcon from "@mui/icons-material/CropFree";
import ChangeHistoryIcon from "@mui/icons-material/ChangeHistory";
import CropSquareIcon from "@mui/icons-material/CropSquare";
import StarIcon from "@mui/icons-material/Star";
import {
  useShapeHandlers,
  getShapePoints,
  INITIAL_RECT,
  INITIAL_TRIANGLE,
  INITIAL_STAR,
} from "../shapeHandler/useShapeHandler";
import { useLassoDrawing } from "./useLassoDrawing";
import { useShapeTransform } from "./useShapeTransform";

const PANEL_SIZE = 500;

export function useImageLassoState(onClose, styles) {
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
  const fit = useMemo(
    () => getFitSize(imgNaturalWidth, imgNaturalHeight, PANEL_SIZE, PANEL_SIZE),
    [imgNaturalWidth, imgNaturalHeight]
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
  const getCurrentShapePoints = useMemo(
    () => () =>
      getShapePoints(
        shapeType,
        rectProps,
        triangleProps,
        starProps,
        lassoPoints
      ),
    [shapeType, rectProps, triangleProps, starProps, lassoPoints]
  );
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

  return {
    imageSrc,
    setImageSrc,
    confirmed,
    setConfirmed,
    borderColor,
    setBorderColor,
    borderWidth,
    setBorderWidth,
    stageImage,
    shapeType,
    setShapeType,
    inputRef,
    rectRef,
    rectTransformerRef,
    rectProps,
    setRectProps,
    triangleRef,
    triangleTransformerRef,
    triangleProps,
    setTriangleProps,
    starRef,
    starTransformerRef,
    starProps,
    setStarProps,
    isMobile,
    fit,
    lassoPoints,
    setLassoPoints,
    setDrawing,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleRedo,
    limitRectDrag,
    handleRectTransform,
    limitTriangleDrag,
    handleTriangleTransform,
    limitStarDrag,
    handleStarTransform,
    getCurrentShapePoints,
    handleRedoAll,
    handleConfirm,
    handleImageUpload,
    SHAPES: [
      { value: "lasso", label: "Freehand", icon: <CropFreeIcon /> },
      { value: "triangle", label: "Triangle", icon: <ChangeHistoryIcon /> },
      { value: "rectangle", label: "Rectangle", icon: <CropSquareIcon /> },
      { value: "star", label: "Star", icon: <StarIcon /> },
    ],
    imgNaturalWidth,
    setImgNaturalWidth,
    imgNaturalHeight,
    setImgNaturalHeight,
    styles,
    PANEL_SIZE,
    onClose,
  };
}
