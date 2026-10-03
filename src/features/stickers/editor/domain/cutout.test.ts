import type { MultiPolygon } from "polygon-clipping";
import { afterEach, describe, expect, it, vi } from "vitest";
import { maskBounds, renderCutoutSource } from "./cutout";

const square = (x: number, y: number, s: number): MultiPolygon => [
  [
    [
      [x, y],
      [x + s, y],
      [x + s, y + s],
      [x, y + s],
    ],
  ],
];

describe("maskBounds", () => {
  it("is null for an empty mask", () => {
    expect(maskBounds([])).toBeNull();
  });

  it("is the box around every ring", () => {
    const mask = [...square(10, 20, 30), ...square(100, 5, 10)];
    expect(maskBounds(mask)).toEqual({ x: 10, y: 5, width: 100, height: 45 });
  });
});

describe("renderCutoutSource", () => {
  const calls: string[] = [];
  const ctx = {
    imageSmoothingQuality: "",
    scale: vi.fn(),
    translate: vi.fn(),
    beginPath: () => calls.push("begin"),
    moveTo: () => calls.push("move"),
    lineTo: () => calls.push("line"),
    closePath: () => calls.push("close"),
    clip: () => calls.push("clip"),
    drawImage: () => calls.push("draw"),
  };
  afterEach(() => {
    vi.restoreAllMocks();
    calls.length = 0;
  });

  it("returns null when nothing is selected", () => {
    expect(renderCutoutSource({} as HTMLImageElement, [])).toBeNull();
  });

  it("crops to the selection and clips before drawing the photo", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    const canvas = renderCutoutSource({} as HTMLImageElement, square(50, 60, 200))!;
    expect([canvas.width, canvas.height]).toEqual([200, 200]);
    expect(ctx.translate).toHaveBeenCalledWith(-50, -60);
    expect(calls.indexOf("clip")).toBeLessThan(calls.indexOf("draw"));
  });

  it("scales down so the longest side is at most maxSide, keeping the aspect ratio", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    const wide: MultiPolygon = [
      [
        [
          [0, 0],
          [4000, 0],
          [4000, 1000],
          [0, 1000],
        ],
      ],
    ];
    const canvas = renderCutoutSource({} as HTMLImageElement, wide, 1280)!;
    expect([canvas.width, canvas.height]).toEqual([1280, 320]);
    expect(ctx.scale).toHaveBeenCalledWith(0.32, 0.32);
  });

  it("never scales up a small selection", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    const canvas = renderCutoutSource({} as HTMLImageElement, square(0, 0, 100))!;
    expect(canvas.width).toBe(100);
  });
});
