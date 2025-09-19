import React, { useEffect, useState } from "react";
import { useImageCustom, scalePoints } from "../../utils/image";
import polygonClipping from "polygon-clipping";
import { joinOpenPathsToClosedRings } from "./utils/lassoUtils";

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
    lassoPaths,
    borderColor,
    borderWidth,
    displayWidth = 500,
    displayHeight = 500,
    styles,
  } = props;
  const [image] = useImageCustom(src, "anonymous");
  const [maskUrl, setMaskUrl] = useState(null);

  useEffect(() => {
    if (
      !image ||
      !Array.isArray(lassoPaths) ||
      lassoPaths.every((path) => path.length < 6)
    ) {
      setMaskUrl(null);
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");

    // Scale all paths to image coordinates
    const scaledPaths = lassoPaths
      .filter((path) => path.length >= 4)
      .map((path) =>
        scalePoints(
          path,
          displayWidth,
          displayHeight,
          image.width,
          image.height
        )
      );

    // Find closed rings and which paths were used
    const { rings: closedRings, used } = joinOpenPathsToClosedRings(
      scaledPaths,
      100
    );

    const autoClosedIsolatedPaths = scaledPaths
      .map((path, idx) => {
        if (!used[idx] && path.length >= 6) {
          // Always auto-close by connecting end to start
          const startX = path[0];
          const startY = path[1];
          return [...path, startX, startY];
        }
        return null;
      })
      .filter(Boolean);

    const allPolygons = [...closedRings, ...autoClosedIsolatedPaths].map(
      pointsToPolygon
    );

    let unionPoly;
    if (allPolygons.length === 1) {
      unionPoly = allPolygons[0];
    } else if (allPolygons.length > 1) {
      unionPoly = polygonClipping.union(...allPolygons);
    } else {
      unionPoly = [];
    }
    // Intersect with image bounds
    const imageRect = [
      [
        [0, 0],
        [image.width, 0],
        [image.width, image.height],
        [0, image.height],
      ],
    ];
    const clipped = polygonClipping.intersection(unionPoly, imageRect);

    if (
      !clipped ||
      !clipped.length ||
      !clipped.some((poly) => poly.length && poly[0].length >= 3)
    ) {
      setMaskUrl(null);
      return;
    }

    // --- Draw mask for all polygons ---
    ctx.save();
    ctx.beginPath();
    clipped.forEach((poly) => {
      poly.forEach((ring) => {
        if (ring.length >= 3) {
          ctx.moveTo(ring[0][0], ring[0][1]);
          for (let i = 1; i < ring.length; i++) {
            ctx.lineTo(ring[i][0], ring[i][1]);
          }
          ctx.closePath();
        }
      });
    });
    ctx.clip();

    ctx.drawImage(image, 0, 0);
    ctx.restore();

    // --- Draw border (clamp points inward) ---
    ctx.save();
    ctx.beginPath();
    clipped.forEach((poly) => {
      poly.forEach((ring) => {
        if (ring.length >= 3) {
          // Clamp each point to be at least borderWidth/2 away from the edge
          const borderPoints = ring.map(([x, y]) => [
            Math.max(
              borderWidth / 2,
              Math.min(image.width - borderWidth / 2, x)
            ),
            Math.max(
              borderWidth / 2,
              Math.min(image.height - borderWidth / 2, y)
            ),
          ]);
          ctx.moveTo(borderPoints[0][0], borderPoints[0][1]);
          for (let i = 1; i < borderPoints.length; i++) {
            ctx.lineTo(borderPoints[i][0], borderPoints[i][1]);
          }
          ctx.closePath();
        }
      });
    });
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.lineJoin = "miter";
    ctx.lineCap = "square";
    ctx.stroke();
    ctx.restore();

    setMaskUrl(canvas.toDataURL());
  }, [image, lassoPaths, borderColor, borderWidth, displayWidth, displayHeight]);

  if (!maskUrl) return null;

  return <img src={maskUrl} alt="masked" className={styles.resultImage} />;
});

export default MaskedImage;
