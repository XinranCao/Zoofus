import { useRef, useState, useEffect } from "react";

export const INITIAL_RECT = {
  x: 100,
  y: 100,
  width: 200,
  height: 150,
  rotation: 0,
};
export const INITIAL_TRIANGLE = { x: 150, y: 100, radius: 100, rotation: 0 };
export const INITIAL_STAR = {
  x: 250,
  y: 250,
  numPoints: 5,
  innerRadius: 60,
  outerRadius: 120,
  rotation: 0,
};

export function useShapeHandlers(imageSrc) {
  const [rectProps, setRectProps] = useState(INITIAL_RECT);
  const [triangleProps, setTriangleProps] = useState(INITIAL_TRIANGLE);
  const [starProps, setStarProps] = useState(INITIAL_STAR);

  useEffect(() => {
    setRectProps(INITIAL_RECT);
    setTriangleProps(INITIAL_TRIANGLE);
    setStarProps(INITIAL_STAR);
  }, [imageSrc]);

  return {
    rectProps,
    setRectProps,
    triangleProps,
    setTriangleProps,
    starProps,
    setStarProps,
  };
}

export function getShapePoints(
  shapeType,
  rectProps,
  triangleProps,
  starProps,
  lassoPoints
) {
  switch (shapeType) {
    case "triangle": {
      const { x: tx, y: ty, radius: tradius, rotation: trot } = triangleProps;
      let tpoints = [];
      for (let i = 0; i < 3; i++) {
        let angle =
          (Math.PI * 2 * i) / 3 - Math.PI / 2 + (trot * Math.PI) / 180;
        tpoints.push(
          tx + tradius * Math.cos(angle),
          ty + tradius * Math.sin(angle)
        );
      }
      return tpoints;
    }
    case "rectangle": {
      const { x, y, width, height, rotation } = rectProps;
      const rad = ((rotation || 0) * Math.PI) / 180;
      const corners = [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height },
      ];
      return corners.flatMap((pt) => {
        const rx = pt.x * Math.cos(rad) - pt.y * Math.sin(rad);
        const ry = pt.x * Math.sin(rad) + pt.y * Math.cos(rad);
        return [x + rx, y + ry];
      });
    }
    case "star": {
      const {
        x: sx,
        y: sy,
        numPoints,
        innerRadius,
        outerRadius,
        rotation: srot,
      } = starProps;
      let spoints = [];
      for (let i = 0; i < numPoints; i++) {
        let angle =
          (Math.PI * 2 * i) / numPoints - Math.PI / 2 + (srot * Math.PI) / 180;
        spoints.push(
          sx + outerRadius * Math.cos(angle),
          sy + outerRadius * Math.sin(angle)
        );
        angle += Math.PI / numPoints;
        spoints.push(
          sx + innerRadius * Math.cos(angle),
          sy + innerRadius * Math.sin(angle)
        );
      }
      return spoints;
    }
    default:
      return lassoPoints;
  }
}
