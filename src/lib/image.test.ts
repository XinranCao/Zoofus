import { describe, it, expect } from "vitest";
import { getFitSize, limitSize, scalePoints } from "./image";

describe("getFitSize", () => {
  it("scales a wide image down to fit the box", () => {
    expect(getFitSize(1000, 500, 500, 500)).toEqual({ width: 500, height: 250 });
  });

  it("scales a tall image down to fit the box", () => {
    expect(getFitSize(500, 1000, 500, 500)).toEqual({ width: 250, height: 500 });
  });

  it("scales a small image up to fill the box", () => {
    expect(getFitSize(100, 50, 500, 500)).toEqual({ width: 500, height: 250 });
  });

  it("keeps an exact fit unchanged", () => {
    expect(getFitSize(500, 500, 500, 500)).toEqual({ width: 500, height: 500 });
  });
});

describe("scalePoints", () => {
  it("scales x and y independently", () => {
    expect(scalePoints([10, 20, 30, 40], 100, 200, 200, 400)).toEqual([20, 40, 60, 80]);
  });

  it("returns an empty array for no points", () => {
    expect(scalePoints([], 100, 100, 200, 200)).toEqual([]);
  });
});

describe("limitSize", () => {
  it("shrinks the longest side to the limit and keeps the aspect ratio", () => {
    expect(limitSize(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(limitSize(3000, 6000, 2000)).toEqual({ width: 1000, height: 2000 });
  });

  it("never upscales", () => {
    expect(limitSize(800, 600, 2048)).toEqual({ width: 800, height: 600 });
  });

  it("never returns a zero side", () => {
    expect(limitSize(10000, 1, 100).height).toBe(1);
  });
});
