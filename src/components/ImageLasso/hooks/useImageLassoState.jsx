import { useState, useRef, useEffect, useMemo } from "react";
import { useImageCustom, getFitSize } from "../../../utils/image";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";
import CropFreeIcon from "@mui/icons-material/CropFree";
import ChangeHistoryIcon from "@mui/icons-material/ChangeHistory";
import CropSquareIcon from "@mui/icons-material/CropSquare";
import StarIcon from "@mui/icons-material/Star";
import { v4 as uuidv4 } from "uuid";
import {
  INITIAL_RECT,
  INITIAL_TRIANGLE,
  INITIAL_STAR,
} from "../shapeHandler/useShapeHandler";

const PANEL_SIZE = 500;

export function useImageLassoState(onClose, styles) {
  const [imageSrc, setImageSrc] = useState(null);
  const [imgNaturalWidth, setImgNaturalWidth] = useState(PANEL_SIZE);
  const [imgNaturalHeight, setImgNaturalHeight] = useState(PANEL_SIZE);
  const [borderColor, setBorderColor] = useState("#ffffff");
  const [borderWidth, setBorderWidth] = useState(5);
  const [stageImage] = useImageCustom(imageSrc, "anonymous");
  const [shapeType, setShapeType] = useState("lasso");
  const inputRef = useRef();

  // Responsive
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Fit image to preview box
  const fit = useMemo(
    () => getFitSize(imgNaturalWidth, imgNaturalHeight, PANEL_SIZE, PANEL_SIZE),
    [imgNaturalWidth, imgNaturalHeight]
  );

  // --- NEW: Store all shapes and lasso selections ---
  const [shapes, setShapes] = useState([]); // { id, type, props }
  const [lassoSelections, setLassoSelections] = useState([]); // { id, path }
  const [activeShapeId, setActiveShapeId] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  // --- Add shape ---
  const addShape = (type) => {
    let props;
    if (type === "rectangle") props = { ...INITIAL_RECT };
    if (type === "triangle") props = { ...INITIAL_TRIANGLE };
    if (type === "star") props = { ...INITIAL_STAR };
    const id = uuidv4();
    setShapes((prev) => [...prev, { id, type, props }]);
    setActiveShapeId(id);
  };

  // --- Add lasso selection ---
  const addLassoSelection = (path) => {
    const id = uuidv4();
    setLassoSelections((prev) => [...prev, { id, path }]);
    setActiveShapeId(id);
  };

  // --- Update shape props ---
  const updateShapeProps = (id, newProps) => {
    setShapes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, props: newProps } : s))
    );
  };

  // --- Remove shape ---
  const removeShape = (id) => {
    setShapes((prev) => prev.filter((s) => s.id !== id));
    setLassoSelections((prev) => prev.filter((l) => l.id !== id));
    if (activeShapeId === id) setActiveShapeId(null);
  };

  // --- Reset all shapes/selections ---
  const handleRedoAll = () => {
    setConfirmed(false);
    setShapes([]);
    setLassoSelections([]);
    setActiveShapeId(null);
  };

  // --- Confirm selection ---
  const handleConfirm = () => {
    setConfirmed(true);
  };

  // --- Image upload ---
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
    handleRedoAll();
  };

  // --- SHAPES for selector ---
  const SHAPES = [
    { value: "lasso", label: "Freehand", icon: <CropFreeIcon /> },
    { value: "triangle", label: "Triangle", icon: <ChangeHistoryIcon /> },
    { value: "rectangle", label: "Rectangle", icon: <CropSquareIcon /> },
    { value: "star", label: "Star", icon: <StarIcon /> },
  ];

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
    isMobile,
    fit,
    SHAPES,
    imgNaturalWidth,
    setImgNaturalWidth,
    imgNaturalHeight,
    setImgNaturalHeight,
    styles,
    PANEL_SIZE,
    onClose,
    // --- NEW MULTI-SHAPE ---
    shapes,
    setShapes,
    lassoSelections,
    setLassoSelections,
    activeShapeId,
    setActiveShapeId,
    addShape,
    addLassoSelection,
    updateShapeProps,
    removeShape,
    handleRedoAll,
    handleConfirm,
    handleImageUpload,
  };
}
