import { useCallback } from "react";

export function useShapeTransform({
  rectRef,
  rectProps,
  setRectProps,
  triangleRef,
  triangleProps,
  setTriangleProps,
  starRef,
  starProps,
  setStarProps,
}) {
  // Rectangle
  const limitRectDrag = useCallback((pos) => ({ x: pos.x, y: pos.y }), []);
  const handleRectTransform = useCallback(() => {
    const node = rectRef.current;
    let width = Math.max(20, node.width() * node.scaleX());
    let height = Math.max(20, node.height() * node.scaleY());
    let x = node.x();
    let y = node.y();
    let rotation = node.rotation();
    setRectProps({
      ...rectProps,
      x,
      y,
      width,
      height,
      rotation,
    });
    node.scaleX(1);
    node.scaleY(1);
  }, [rectRef, rectProps, setRectProps]);

  // Triangle
  const limitTriangleDrag = useCallback((pos) => ({ x: pos.x, y: pos.y }), []);
  const handleTriangleTransform = useCallback(() => {
    const node = triangleRef.current;
    let radius = Math.max(20, node.radius() * node.scaleX());
    let x = node.x();
    let y = node.y();
    let rotation = node.rotation();
    setTriangleProps({
      ...triangleProps,
      x,
      y,
      radius,
      rotation,
    });
    node.scaleX(1);
    node.scaleY(1);
  }, [triangleRef, triangleProps, setTriangleProps]);

  // Star
  const limitStarDrag = useCallback((pos) => ({ x: pos.x, y: pos.y }), []);
  const handleStarTransform = useCallback(() => {
    const node = starRef.current;
    let outerRadius = Math.max(20, node.outerRadius() * node.scaleX());
    let innerRadius = Math.max(10, node.innerRadius() * node.scaleY());
    let x = node.x();
    let y = node.y();
    let rotation = node.rotation();
    setStarProps({
      ...starProps,
      x,
      y,
      outerRadius,
      innerRadius,
      rotation,
    });
    node.scaleX(1);
    node.scaleY(1);
  }, [starRef, starProps, setStarProps]);

  return {
    limitRectDrag,
    handleRectTransform,
    limitTriangleDrag,
    handleTriangleTransform,
    limitStarDrag,
    handleStarTransform,
  };
}
