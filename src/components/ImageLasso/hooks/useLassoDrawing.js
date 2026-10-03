import { useState, useRef } from "react";

export function useLassoDrawing({ imageSrc, shapeType }) {
  const [drawing, setDrawing] = useState(false);
  const [lassoPaths, setLassoPaths] = useState([]);
  const [confirmed, setConfirmed] = useState(false);
  const currentPathRef = useRef(null);

  const handlePointerDown = (e) => {
    if (!imageSrc || confirmed || shapeType !== "lasso" || drawing) return;
    setDrawing(true);
    const pt = getPointerPosition(e);
    currentPathRef.current = [pt[0], pt[1]];
    setLassoPaths((paths) => [...paths, [...currentPathRef.current]]);
  };

  const handlePointerMove = (e) => {
    if (!drawing || confirmed || shapeType !== "lasso") return;
    const pt = getPointerPosition(e);
    if (!currentPathRef.current) return;
    const lastX = currentPathRef.current[currentPathRef.current.length - 2];
    const lastY = currentPathRef.current[currentPathRef.current.length - 1];
    if (pt[0] !== lastX || pt[1] !== lastY) {
      currentPathRef.current.push(pt[0], pt[1]);
      setLassoPaths((paths) => {
        // Replace the last path with the updated current path
        const newPaths = [...paths];
        newPaths[newPaths.length - 1] = [...currentPathRef.current];
        return newPaths;
      });
    }
  };

  const handlePointerUp = () => {
    setDrawing(false);
    currentPathRef.current = null;
    setLassoPaths((paths) => paths.filter((path) => path.length >= 4));
  };

  const handleConfirm = () => {
    setConfirmed(true);
  };

  const handleRedo = () => {
    setLassoPaths([]);
    setConfirmed(false);
    currentPathRef.current = null;
  };

  const getPointerPosition = (e) => {
    const pos = e.target.getStage().getPointerPosition();
    return [pos.x, pos.y];
  };

  return {
    drawing,
    lassoPaths,
    setLassoPaths,
    setDrawing,
    confirmed,
    setConfirmed,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleConfirm,
    handleRedo,
  };
}
