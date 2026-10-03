import React, { useEffect, useState } from "react";
import { useImageCustom, scalePoints } from "../../utils/image";
import polygonClipping from "polygon-clipping";
import { joinOpenPathsToClosedRings } from "./utils/lassoUtils";
import { getShapePoints } from "./shapeHandler/useShapeHandler";

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
    lassoSelections = [],
    shapes,
    borderColor,
    borderWidth,
    displayWidth = 500,
    displayHeight = 500,
    styles,
  } = props;
  const [image] = useImageCustom(src, "anonymous");
  const [maskUrl, setMaskUrl] = useState(null);

  useEffect(() => {
    if (!image) {
      setMaskUrl(null);
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");

    // Separate lassoSelections by mode
    const selectLassoPaths = lassoSelections
      .filter((sel) => sel.mode !== "deselect")
      .filter((sel) => sel.path.length >= 4)
      .map((sel) =>
        scalePoints(
          sel.path,
          displayWidth,
          displayHeight,
          image.width,
          image.height
        )
      );
    const deselectLassoPaths = lassoSelections
      .filter((sel) => sel.mode === "deselect")
      .filter((sel) => sel.path.length >= 4)
      .map((sel) =>
        scalePoints(
          sel.path,
          displayWidth,
          displayHeight,
          image.width,
          image.height
        )
      );

    // Scale all shapes to image coordinates
    const selectShapePaths = shapes
      .filter((shape) => shape.mode !== "deselect")
      .map((shape) =>
        scalePoints(
          getShapePoints(shape.type, shape.props, shape.props, shape.props, []),
          displayWidth,
          displayHeight,
          image.width,
          image.height
        )
      )
      .filter((pts) => pts.length >= 6);
    const deselectShapePaths = shapes
      .filter((shape) => shape.mode === "deselect")
      .map((shape) =>
        scalePoints(
          getShapePoints(shape.type, shape.props, shape.props, shape.props, []),
          displayWidth,
          displayHeight,
          image.width,
          image.height
        )
      )
      .filter((pts) => pts.length >= 6);

    // Combine all select and deselect paths
    const allSelectPaths = [...selectLassoPaths, ...selectShapePaths];
    const allDeselectPaths = [...deselectLassoPaths, ...deselectShapePaths];

    // Find closed rings and which paths were used (for select)
    const { rings: closedRings, used } = joinOpenPathsToClosedRings(
      allSelectPaths,
      100
    );

    const autoClosedIsolatedPaths = allSelectPaths
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

    // Subtract all deselect polygons
    let deselectPolygons = allDeselectPaths
      .filter((pts) => pts.length >= 6)
      .map(pointsToPolygon);
    let finalPoly = unionPoly;
    if (deselectPolygons.length > 0 && finalPoly && finalPoly.length) {
      deselectPolygons.forEach((dPoly) => {
        finalPoly = polygonClipping.difference(finalPoly, dPoly);
      });
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
    const clipped = polygonClipping.intersection(finalPoly, imageRect);

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
  }, [image, lassoSelections, shapes, borderColor, borderWidth, displayWidth, displayHeight]);

  if (!maskUrl) return null;

  return <img src={maskUrl} alt="masked" className={styles.resultImage} />;
});

export default MaskedImage;
