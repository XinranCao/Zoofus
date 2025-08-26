import { useState } from "react";
import MaskedImage from "./MaskedImage";
import { useImageCustom } from "../../utils/image";
import { Stage, Layer, Image as KonvaImage, Line } from "react-konva";
import styles from "./ImageLassoPanel.module.less";

const ImageLassoPanel = () => {
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
  );
};

export default ImageLassoPanel;
