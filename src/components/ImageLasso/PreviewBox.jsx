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

const PreviewBox = ({
  imageSrc,
  confirmed,
  fit,
  stageImage,
  shapeType,
  lassoPoints,
  getCurrentShapePoints,
  borderColor,
  borderWidth,
  imgNaturalWidth,
  imgNaturalHeight,
  inputRef,
  handleImageUpload,
  setConfirmed,
  setLassoPoints,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  rectRef,
  rectTransformerRef,
  rectProps,
  setRectProps,
  limitRectDrag,
  handleRectTransform,
  triangleRef,
  triangleTransformerRef,
  triangleProps,
  setTriangleProps,
  limitTriangleDrag,
  handleTriangleTransform,
  starRef,
  starTransformerRef,
  starProps,
  setStarProps,
  limitStarDrag,
  handleStarTransform,
  styles,
  PANEL_SIZE,
  setShapeType,
  isMobile,
  SHAPES,
}) => (
  <Box>
    <Box>
      <ShapeSelector
        shapeType={shapeType}
        setShapeType={setShapeType}
        SHAPES={SHAPES}
        isMobile={isMobile}
        disabled={!imageSrc || confirmed}
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
                shapeType === "lasso" ? lassoPoints : getCurrentShapePoints()
              }
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
          setConfirmed(false);
          setLassoPoints([]);
        }}
      />
    </Box>
  </Box>
);

export default PreviewBox;
