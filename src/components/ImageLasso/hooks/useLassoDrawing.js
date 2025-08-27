import { useState } from "react";

/**
 * Custom hook for lasso drawing logic and pointer event handlers.
 */
export function useLassoDrawing({ imageSrc, confirmed, shapeType }) {
  const [drawing, setDrawing] = useState(false);
  const [lassoPoints, setLassoPoints] = useState([]);

  const handlePointerDown = (e) => {
    if (!imageSrc || confirmed || shapeType !== "lasso") return;
    setDrawing(true);
    setLassoPoints(getPointerPosition(e));
  };

  const handlePointerMove = (e) => {
    if (!drawing || confirmed || shapeType !== "lasso") return;
    setLassoPoints((pts) => [...pts, ...getPointerPosition(e)]);
  };

  const handlePointerUp = () => {
    setDrawing(false);
  };

  const handleRedo = () => {
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

  return {
    drawing,
    lassoPoints,
    setLassoPoints,
    setDrawing,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleRedo,
  };
}
