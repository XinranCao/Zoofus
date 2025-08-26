import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer, Image as KonvaImage, Line } from "react-konva";
import styles from "./Home.module.less";
import PageContainer from "../../components/PageContainer";

// Custom hook to load image
function useImageCustom(src, crossOrigin) {
  const [image, setImage] = useState(null);
  useEffect(() => {
    if (!src) return;
    const img = new window.Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.src = src;
    img.onload = () => setImage(img);
    return () => setImage(null);
  }, [src, crossOrigin]);
  return [image];
}

const BORDER_COLORS = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#000000"];

// Helper to scale lasso points from stage to image size
function scalePoints(points, fromWidth, fromHeight, toWidth, toHeight) {
  const xScale = toWidth / fromWidth;
  const yScale = toHeight / fromHeight;
  const scaled = [];
  for (let i = 0; i < points.length; i += 2) {
    scaled.push(points[i] * xScale, points[i + 1] * yScale);
  }
  return scaled;
}

function MaskedImage({ src, lassoPoints, borderColor, borderWidth }) {
  const [image] = useImageCustom(src, "anonymous");
  const [maskUrl, setMaskUrl] = useState(null);

  useEffect(() => {
    if (!image || lassoPoints.length < 6) {
      setMaskUrl(null);
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");

    // Scale lasso points from stage (500x500) to image size
    const scaledPoints = scalePoints(
      lassoPoints,
      500, // stage width
      500, // stage height
      image.width,
      image.height
    );

    // Draw lasso mask
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(scaledPoints[0], scaledPoints[1]);
    for (let i = 2; i < scaledPoints.length; i += 2) {
      ctx.lineTo(scaledPoints[i], scaledPoints[i + 1]);
    }
    ctx.closePath();
    ctx.clip();

    // Draw image inside mask
    ctx.drawImage(image, 0, 0);
    ctx.restore();

    // Draw border OUTSIDE the mask (no shadow, just stroke)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(scaledPoints[0], scaledPoints[1]);
    for (let i = 2; i < scaledPoints.length; i += 2) {
      ctx.lineTo(scaledPoints[i], scaledPoints[i + 1]);
    }
    ctx.closePath();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.stroke();
    ctx.restore();

    setMaskUrl(canvas.toDataURL());
  }, [image, lassoPoints, borderColor, borderWidth]);

  if (!maskUrl) return null;

  return <img src={maskUrl} alt="masked" className={styles.resultImage} />;
}

const HomePage = () => {
  const [imageSrc, setImageSrc] = useState(null);
  const [drawing, setDrawing] = useState(false);
  const [lassoPoints, setLassoPoints] = useState([]);
  const [confirmed, setConfirmed] = useState(false);
  const [borderColor, setBorderColor] = useState("#fff");
  const [borderWidth, setBorderWidth] = useState(5);
  const [stageImage] = useImageCustom(imageSrc, "anonymous");

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) setImageSrc(URL.createObjectURL(file));
    setConfirmed(false);
    setLassoPoints([]);
  };

  const getPointerPosition = (e) => {
    // Konva wraps native event in e.evt
    if (e.evt.touches && e.evt.touches.length > 0) {
      // Touch event
      const rect = e.target.getStage().container().getBoundingClientRect();
      const x = e.evt.touches[0].clientX - rect.left;
      const y = e.evt.touches[0].clientY - rect.top;
      return [x, y];
    } else {
      // Mouse event
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
    <PageContainer>
      <div className={styles.homePageContainer}>
        <div className={styles.panel}>
          <h1>Image Lasso Selection</h1>
          <input type="file" accept="image/*" onChange={handleImageUpload} />
          {imageSrc && !confirmed && (
            <div className={styles.stageWrapper}>
              <div className={styles.buttonRow}>
                <button onClick={handleRedo}>Redo</button>
                <button onClick={handleConfirm}>Confirm</button>
              </div>
              <Stage
                width={500}
                height={500}
                className={styles.stage}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
              >
                <Layer>
                  {stageImage && (
                    <KonvaImage image={stageImage} width={500} height={500} />
                  )}
                  {lassoPoints.length > 2 && (
                    <Line
                      points={lassoPoints}
                      stroke="#00f"
                      strokeWidth={2}
                      tension={0.5}
                      closed={confirmed}
                    />
                  )}
                </Layer>
              </Stage>
            </div>
          )}
          {imageSrc && confirmed && (
            <div className={styles.resultPanel}>
              <MaskedImage
                src={imageSrc}
                lassoPoints={lassoPoints}
                borderColor={borderColor}
                borderWidth={borderWidth}
              />
              <div className={styles.borderControls}>
                <label>
                  Border Color:
                  <input
                    type="color"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    style={{ marginLeft: 8, verticalAlign: "middle" }}
                  />
                </label>
                <label>
                  Border Width:
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={borderWidth}
                    onChange={(e) => setBorderWidth(Number(e.target.value))}
                    style={{ marginLeft: 8, verticalAlign: "middle" }}
                  />
                  {borderWidth}px
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default HomePage;
