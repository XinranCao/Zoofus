import type { MultiPolygon } from "polygon-clipping";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderCutout } from "./render";

const calls: string[] = [];
const ctx = {
  save: () => calls.push("save"),
  restore: () => calls.push("restore"),
  beginPath: () => calls.push("beginPath"),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: () => calls.push("closePath"),
  clip: () => calls.push("clip"),
  drawImage: () => calls.push("drawImage"),
  stroke: () => calls.push("stroke"),
  strokeStyle: "",
  lineWidth: 0,
  lineJoin: "",
  lineCap: "",
};

beforeEach(() => {
  calls.length = 0;
  ctx.moveTo.mockClear();
  ctx.lineTo.mockClear();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D,
  );
});
afterEach(() => vi.restoreAllMocks());

const image = { naturalWidth: 200, naturalHeight: 100 } as HTMLImageElement;
const square: MultiPolygon = [
  [
    [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ],
  ],
];

describe("renderCutout", () => {
  it("sizes the canvas to the image and clips the image to the mask", () => {
    const canvas = renderCutout(image, square, { color: "#fff", width: 0 });
    expect([canvas.width, canvas.height]).toEqual([200, 100]);
    expect(calls.indexOf("clip")).toBeGreaterThan(-1);
    expect(calls.indexOf("clip")).toBeLessThan(calls.indexOf("drawImage"));
  });

  it("draws no border when the width is 0", () => {
    renderCutout(image, square, { color: "#fff", width: 0 });
    expect(calls).not.toContain("stroke");
  });

  it("strokes a border with the chosen colour and width", () => {
    renderCutout(image, square, { color: "#ff0000", width: 10 });
    expect(calls).toContain("stroke");
    expect(ctx.strokeStyle).toBe("#ff0000");
    expect(ctx.lineWidth).toBe(10);
  });

  it("pulls border points inside the image so clipped edges still get a border", () => {
    renderCutout(image, square, { color: "#fff", width: 10 });
    // Corner (0, 0) is moved in by half the border width: the border call is the last moveTo.
    const lastMove = ctx.moveTo.mock.calls.at(-1)!;
    expect(lastMove).toEqual([5, 5]);
  });
});
