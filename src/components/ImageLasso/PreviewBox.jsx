import React, { useCallback, useRef, useEffect } from "react";
import { Box, Typography, IconButton, Input } from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
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
import MaskedImage from "./MaskedImage";
import ShapeSelector from "./ShapeSelector";
import { useImageLasso } from "./ImageLassoContext";
import { useLassoDrawing } from "./hooks/useLassoDrawing";

// Centralized color definitions for lasso and shapes
const LASSO_COLORS = {
  drawing: "#1976d2", // blue for drawing
  selected: "#43a047", // green for selected
  deselected: "#e53935", // red for deselected
  inactive: "#bdbdbd", // gray for inactive
  deselectFill: "rgba(229, 57, 53, 0.08)", // light red
  selectFill: "rgba(67, 160, 71, 0.10)", // light green
};

const PreviewBox = () => {
  const transformerRef = useRef();
  // Ref map for all shapes
  const shapeRefs = useRef({});
  const {
    imageSrc,
    confirmed,
    fit,
    stageImage,
    shapeType,
    setShapeType,
    SHAPES,
    isMobile,
    borderColor,
    borderWidth,
    imgNaturalWidth,
    imgNaturalHeight,
    inputRef,
    handleImageUpload,
    styles,
    PANEL_SIZE,
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
  } = useImageLasso();

  // Freehand drawing hook
  const {
    drawing,
    lassoPaths,
    setLassoPaths,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useLassoDrawing({ imageSrc, shapeType });
  const { selectMode } = useImageLasso();

  // Add finished lasso paths to global selections
  useEffect(() => {
    if (!drawing && lassoPaths.length > 0) {
      lassoPaths.forEach((path) => {
        if (
          path.length >= 4 &&
          !lassoSelections.some(
            (sel) =>
              sel.path.length === path.length &&
              sel.path.every((v, i) => v === path[i])
          )
        ) {
          addLassoSelection(path, selectMode);
        }
      });
      setLassoPaths([]);
    }
  }, [
    drawing,
    lassoPaths,
    lassoSelections,
    addLassoSelection,
    setLassoPaths,
    selectMode,
  ]);

  // Delete active shape or lasso selection
  const handleDeleteActive = () => {
    if (!activeShapeId) return;
    removeShape(activeShapeId);
  };

  // Shape drag handler
  const handleShapeDragMove = useCallback(
    (id, type, e) => {
      const pos = e.target.position();
      let newProps;
      if (type === "rectangle") {
        newProps = {
          ...shapes.find((s) => s.id === id).props,
          x: pos.x,
          y: pos.y,
        };
      }
      if (type === "triangle") {
        newProps = {
          ...shapes.find((s) => s.id === id).props,
          x: pos.x,
          y: pos.y,
        };
      }
      if (type === "star") {
        newProps = {
          ...shapes.find((s) => s.id === id).props,
          x: pos.x,
          y: pos.y,
        };
      }
      updateShapeProps(id, newProps);
    },
    [shapes, updateShapeProps]
  );

  // Only attach pointer events for freehand drawing
  const stageEvents =
    shapeType === "lasso" && !confirmed
      ? {
          onPointerDown: handlePointerDown,
          onPointerMove: handlePointerMove,
          onPointerUp: handlePointerUp,
        }
      : {};

  return (
    <Box className={styles.previewContainer}>
      {/* Reserve space for controls to prevent layout shift */}
      <Box className={styles.controlsBox} sx={{ minHeight: 100 }}>
        <ShapeSelector
          shapeType={shapeType}
          setShapeType={setShapeType}
          SHAPES={SHAPES}
          isMobile={isMobile}
          disabled={!imageSrc || confirmed}
          addShape={addShape}
          addLassoSelection={addLassoSelection}
          imageSrc={imageSrc}
          confirmed={confirmed}
          activeShapeId={activeShapeId}
          handleDeleteActive={handleDeleteActive}
        />
      </Box>
      <Box
        className={styles.previewBox}
        sx={{ width: PANEL_SIZE, height: PANEL_SIZE }}
      >
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
              display: "flex",
            }}
          >
            {!confirmed ? (
              <Stage
                width={fit.width}
                height={fit.height}
                className={styles.stage}
                style={{ width: fit.width, height: fit.height }}
                {...stageEvents}
              >
                <Layer>
                  {stageImage && (
                    <KonvaImage
                      image={stageImage}
                      width={fit.width}
                      height={fit.height}
                    />
                  )}
                  {/* Render finished lasso selections */}
                  {lassoSelections.map((sel) =>
                    sel.path.length > 2 ? (
                      <>
                        {/* Invisible thick line for easier hit area */}
                        <Line
                          key={sel.id + "-hit"}
                          points={sel.path}
                          stroke="#000"
                          strokeWidth={16}
                          opacity={0}
                          tension={0.5}
                          closed={false}
                          onClick={() => setActiveShapeId(sel.id)}
                          listening={true}
                          perfectDrawEnabled={false}
                        />
                        {/* Visible line */}
                        <Line
                          key={sel.id}
                          points={sel.path}
                          stroke={
                            activeShapeId === sel.id
                              ? LASSO_COLORS.drawing
                              : sel.mode === "deselect"
                              ? LASSO_COLORS.deselected
                              : LASSO_COLORS.selected
                          }
                          strokeWidth={2}
                          tension={0.5}
                          closed={false}
                          dash={sel.mode === "deselect" ? [10, 6] : []}
                          onClick={() => setActiveShapeId(sel.id)}
                        />
                      </>
                    ) : null
                  )}
                  {/* Render all shapes */}
                  {shapes.map((shape) => {
                    const isActive = activeShapeId === shape.id;
                    if (!shapeRefs.current[shape.id]) {
                      shapeRefs.current[shape.id] = React.createRef();
                    }
                    const ref = shapeRefs.current[shape.id];
                    const isDeselect = shape.mode === "deselect";
                    const strokeColor = isActive
                      ? LASSO_COLORS.drawing
                      : isDeselect
                      ? LASSO_COLORS.deselected
                      : LASSO_COLORS.selected;
                    const fillColor = isDeselect
                      ? LASSO_COLORS.deselectFill
                      : LASSO_COLORS.selectFill;
                    const dash = isDeselect ? [10, 6] : [];
                    if (shape.type === "rectangle") {
                      return (
                        <Rect
                          key={shape.id}
                          {...shape.props}
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth={2}
                          draggable={isActive}
                          rotation={shape.props.rotation || 0}
                          dash={dash}
                          onDragMove={(e) =>
                            handleShapeDragMove(shape.id, "rectangle", e)
                          }
                          onClick={() => setActiveShapeId(shape.id)}
                          ref={ref}
                          onTransformEnd={(e) => {
                            const node = e.target;
                            const scaleX = node.scaleX();
                            const scaleY = node.scaleY();
                            updateShapeProps(shape.id, {
                              ...shape.props,
                              x: node.x(),
                              y: node.y(),
                              width: Math.max(5, node.width() * scaleX),
                              height: Math.max(5, node.height() * scaleY),
                              rotation: node.rotation(),
                            });
                            node.scaleX(1);
                            node.scaleY(1);
                          }}
                        />
                      );
                    }
                    if (shape.type === "triangle") {
                      return (
                        <RegularPolygon
                          key={shape.id}
                          x={shape.props.x}
                          y={shape.props.y}
                          sides={3}
                          radius={shape.props.radius}
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth={2}
                          rotation={shape.props.rotation || 0}
                          draggable={isActive}
                          dash={dash}
                          onDragMove={(e) =>
                            handleShapeDragMove(shape.id, "triangle", e)
                          }
                          onClick={() => setActiveShapeId(shape.id)}
                          ref={ref}
                          onTransformEnd={(e) => {
                            const node = e.target;
                            const scaleX = node.scaleX();
                            updateShapeProps(shape.id, {
                              ...shape.props,
                              x: node.x(),
                              y: node.y(),
                              radius: Math.max(5, shape.props.radius * scaleX),
                              rotation: node.rotation(),
                            });
                            node.scaleX(1);
                            node.scaleY(1);
                          }}
                        />
                      );
                    }
                    if (shape.type === "star") {
                      return (
                        <Star
                          key={shape.id}
                          x={shape.props.x}
                          y={shape.props.y}
                          numPoints={shape.props.numPoints}
                          innerRadius={shape.props.innerRadius}
                          outerRadius={shape.props.outerRadius}
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth={2}
                          rotation={shape.props.rotation || 0}
                          draggable={isActive}
                          dash={dash}
                          onDragMove={(e) =>
                            handleShapeDragMove(shape.id, "star", e)
                          }
                          onClick={() => setActiveShapeId(shape.id)}
                          ref={ref}
                          onTransformEnd={(e) => {
                            const node = e.target;
                            const scaleX = node.scaleX();
                            updateShapeProps(shape.id, {
                              ...shape.props,
                              x: node.x(),
                              y: node.y(),
                              innerRadius: Math.max(
                                5,
                                shape.props.innerRadius * scaleX
                              ),
                              outerRadius: Math.max(
                                5,
                                shape.props.outerRadius * scaleX
                              ),
                              rotation: node.rotation(),
                            });
                            node.scaleX(1);
                            node.scaleY(1);
                          }}
                        />
                      );
                    }
                    return null;
                  })}
                  {/* Render currently drawing lasso path */}
                  {shapeType === "lasso" &&
                    !confirmed &&
                    lassoPaths.map((path, idx) =>
                      path.length > 2 ? (
                        <Line
                          key={`drawing-${idx}`}
                          points={path}
                          stroke={LASSO_COLORS.drawing}
                          strokeWidth={2}
                          tension={0.5}
                          closed={false}
                        />
                      ) : null
                    )}
                  {/* Transformer for active shape */}
                  {activeShapeId &&
                    shapeRefs.current[activeShapeId] &&
                    shapeRefs.current[activeShapeId].current && (
                      <Transformer
                        ref={transformerRef}
                        nodes={[shapeRefs.current[activeShapeId].current]}
                        rotateEnabled={true}
                        enabledAnchors={[
                          "top-left",
                          "top-right",
                          "bottom-left",
                          "bottom-right",
                        ]}
                      />
                    )}
                </Layer>
              </Stage>
            ) : (
              <MaskedImage
                src={imageSrc}
                lassoSelections={lassoSelections}
                shapes={shapes}
                borderColor={borderColor}
                borderWidth={borderWidth}
                displayWidth={fit.width}
                displayHeight={fit.height}
                naturalWidth={imgNaturalWidth}
                naturalHeight={imgNaturalHeight}
                styles={styles}
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
          }}
        />
      </Box>
    </Box>
  );
};

export default PreviewBox;
