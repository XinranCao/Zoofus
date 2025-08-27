import React, { useEffect, useState } from "react";
import { useImageCustom, scalePoints } from "../../utils/image";
import polygonClipping from "polygon-clipping";

function pointsToPolygon(points) {
  const poly = [];
  for (let i = 0; i < points.length; i += 2) {
    poly.push([points[i], points[i + 1]]);
  }
  return [poly];
}

const MaskedImage = React.memo(function MaskedImage(props) {
  const {
    src,
    lassoPoints,
    borderColor,
    borderWidth,
    displayWidth = 500,
    displayHeight = 500,
    styles,
  } = props;
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
      displayWidth,
      displayHeight,
      image.width,
      image.height
    );

    const shapePoly = pointsToPolygon(scaledPoints);
    const imageRect = [
      [
        [0, 0],
        [image.width, 0],
        [image.width, image.height],
        [0, image.height],
      ],
    ];

    const clipped = polygonClipping.intersection(shapePoly, imageRect);
    const clippedPoints =
      clipped && clipped.length && clipped[0].length
        ? clipped[0][0].flat()
        : [];

    if (clippedPoints.length < 6) {
      setMaskUrl(null);
      return;
    }

    // --- Draw mask (use unclamped points) ---
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(clippedPoints[0], clippedPoints[1]);
    for (let i = 2; i < clippedPoints.length; i += 2) {
      ctx.lineTo(clippedPoints[i], clippedPoints[i + 1]);
    }
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(image, 0, 0);
    ctx.restore();

    // --- Draw border (clamp points inward) ---
    ctx.save();
    ctx.beginPath();
    // Clamp each point to be at least borderWidth/2 away from the edge
    const borderPoints = [];
    for (let i = 0; i < clippedPoints.length; i += 2) {
      const x = Math.max(
        borderWidth / 2,
        Math.min(image.width - borderWidth / 2, clippedPoints[i])
      );
      const y = Math.max(
        borderWidth / 2,
        Math.min(image.height - borderWidth / 2, clippedPoints[i + 1])
      );
      borderPoints.push([x, y]);
    }
    ctx.moveTo(borderPoints[0][0], borderPoints[0][1]);
    for (let i = 1; i < borderPoints.length; i++) {
      ctx.lineTo(borderPoints[i][0], borderPoints[i][1]);
    }
    ctx.closePath();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.lineJoin = "miter";
    ctx.lineCap = "square";
    ctx.stroke();
    ctx.restore();

    setMaskUrl(canvas.toDataURL());
  }, [image, lassoPoints, borderColor, borderWidth, displayWidth, displayHeight]);

  if (!maskUrl) return null;

  return <img src={maskUrl} alt="masked" className={styles.resultImage} />;
});

export default MaskedImage;
