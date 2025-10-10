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
          addLassoSelection(path);
        }
      });
      setLassoPaths([]);
    }
  }, [drawing, lassoPaths, lassoSelections, addLassoSelection, setLassoPaths]);

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
      <Box className={styles.controlsBox}>
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
                      <Line
                        key={sel.id}
                        points={sel.path}
                        stroke={
                          activeShapeId === sel.id ? "#d32f2f" : "#1976d2"
                        }
                        strokeWidth={2}
                        tension={0.5}
                        closed={false}
                        onClick={() => setActiveShapeId(sel.id)}
                      />
                    ) : null
                  )}
                  {/* Render all shapes */}
                  {shapes.map((shape) => {
                    const isActive = activeShapeId === shape.id;
                    // Create a ref for each shape
                    if (!shapeRefs.current[shape.id]) {
                      shapeRefs.current[shape.id] = React.createRef();
                    }
                    const ref = shapeRefs.current[shape.id];
                    if (shape.type === "rectangle") {
                      return (
                        <Rect
                          key={shape.id}
                          {...shape.props}
                          fill="rgba(25, 118, 210, 0.1)"
                          stroke={isActive ? "#d32f2f" : "#1976d2"}
                          strokeWidth={2}
                          draggable={isActive}
                          rotation={shape.props.rotation || 0}
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
                          fill="rgba(25, 118, 210, 0.1)"
                          stroke={isActive ? "#d32f2f" : "#1976d2"}
                          strokeWidth={2}
                          rotation={shape.props.rotation || 0}
                          draggable={isActive}
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
                          fill="rgba(25, 118, 210, 0.1)"
                          stroke={isActive ? "#d32f2f" : "#1976d2"}
                          strokeWidth={2}
                          rotation={shape.props.rotation || 0}
                          draggable={isActive}
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
                          stroke="#d32f2f"
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
                lassoPaths={lassoSelections.map((sel) => sel.path)}
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
