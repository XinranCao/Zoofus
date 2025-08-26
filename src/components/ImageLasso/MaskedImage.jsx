import { useEffect, useState } from "react";
import { useImageCustom, scalePoints } from "../../utils/image";
import styles from "./ImageLassoPanel.module.less";

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

    const scaledPoints = scalePoints(
      lassoPoints,
      500,
      500,
      image.width,
      image.height
    );

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(scaledPoints[0], scaledPoints[1]);
    for (let i = 2; i < scaledPoints.length; i += 2) {
      ctx.lineTo(scaledPoints[i], scaledPoints[i + 1]);
    }
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(image, 0, 0);
    ctx.restore();

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

export default MaskedImage;
