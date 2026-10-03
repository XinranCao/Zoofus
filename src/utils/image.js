import { useState, useEffect } from "react";

// Compress image file using Canvas API
export async function compressImage(file, quality = 0.2) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
            });
            resolve(compressedFile);
          } else {
            reject(new Error("Compression failed"));
          }
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function useImageCustom(src, crossOrigin) {
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

export function scalePoints(points, fromWidth, fromHeight, toWidth, toHeight) {
  const xScale = toWidth / fromWidth;
  const yScale = toHeight / fromHeight;
  const scaled = [];
  for (let i = 0; i < points.length; i += 2) {
    scaled.push(points[i] * xScale, points[i + 1] * yScale);
  }
  return scaled;
}

export function getFitSize(nw, nh, maxW, maxH) {
  const ratio = Math.min(maxW / nw, maxH / nh);
  return {
    width: Math.round(nw * ratio),
    height: Math.round(nh * ratio),
  };
}
