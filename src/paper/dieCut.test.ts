import { describe, expect, it, vi } from "vitest";
import {
  EDGE_SHAPES,
  dieCut,
  dieCutPad,
  edgeRadius,
  edgeWidth,
  type CanvasSource,
} from "./dieCut";

interface FakeCanvas {
  width: number;
  height: number;
  calls: { fn: string; args: unknown[] }[];
  getContext: () => Record<string, unknown>;
}

function factory() {
  const canvases: FakeCanvas[] = [];
  const createCanvas = (w: number, h: number) => {
    const c: FakeCanvas = { width: w, height: h, calls: [], getContext: () => ctx };
    const ctx: Record<string, unknown> = {
      drawImage: (...args: unknown[]) => c.calls.push({ fn: "drawImage", args }),
      fillRect: (...args: unknown[]) => c.calls.push({ fn: "fillRect", args }),
      globalCompositeOperation: "source-over",
      fillStyle: "",
    };
    canvases.push(c);
    return c as unknown as HTMLCanvasElement;
  };
  return { canvases, createCanvas };
}

const src = { width: 100, height: 80 } as unknown as CanvasSource;
const drawImageCalls = (c: FakeCanvas) =>
  c.calls.filter((x) => x.fn === "drawImage").length;

describe("edgeWidth", () => {
  it("is 4.5% of the long side times the scale, with no px clamp", () => {
    expect(edgeWidth(100)).toBe(5);
    expect(edgeWidth(400)).toBe(18);
    expect(edgeWidth(2000)).toBe(90);
    expect(edgeWidth(3000, 1.6)).toBe(216);
    expect(edgeWidth(400, 0)).toBe(0);
  });
  it("scales linearly with resolution", () => {
    expect(edgeWidth(1200) / edgeWidth(300)).toBeCloseTo(4, 0);
  });
});

describe("dieCut", () => {
  it("makes an output of input size plus 2 × pad", () => {
    for (const border of [0, 6, 18, 40]) {
      const { createCanvas, canvases } = factory();
      const out = dieCut(src, {
        border,
        shape: "wobbly",
        createCanvas,
      }) as unknown as FakeCanvas;
      const pad = dieCutPad(border);
      expect(out.width).toBe(100 + pad * 2);
      expect(out.height).toBe(80 + pad * 2);
      expect(canvases[0]).toBe(out);
    }
  });

  it("adds no border pixels when the border is 0: only the source is drawn", () => {
    const { createCanvas, canvases } = factory();
    dieCut(src, { border: 0, createCanvas });
    expect(canvases).toHaveLength(1);
    expect(drawImageCalls(canvases[0]!)).toBe(1);
  });

  it("draws the edge for every shape when the border is above 0", () => {
    for (const shape of EDGE_SHAPES) {
      const { createCanvas, canvases } = factory();
      dieCut(src, { border: 8, shape, createCanvas });
      expect(canvases.length).toBeGreaterThan(1);
    }
  });

  it("paints a pale lip first for torn edges (an extra stamped layer)", () => {
    const wobbly = factory();
    dieCut(src, { border: 8, shape: "wobbly", createCanvas: wobbly.createCanvas });
    const torn = factory();
    dieCut(src, { border: 8, shape: "torn", createCanvas: torn.createCanvas });
    expect(torn.canvases.length).toBe(wobbly.canvases.length + 1);
  });

  it("paints the edge with a pattern image when given a fill", () => {
    const { createCanvas, canvases } = factory();
    const fill = { width: 120, height: 100 } as unknown as CanvasImageSource;
    dieCut(src, { border: 8, shape: "smooth", fill, createCanvas });
    const usedFill = canvases.some((c) =>
      c.calls.some((x) => x.fn === "drawImage" && x.args[0] === fill),
    );
    expect(usedFill).toBe(true);
  });

  it("falls back to a colour fill when there is no pattern", () => {
    const { createCanvas, canvases } = factory();
    dieCut(src, { border: 8, shape: "smooth", color: "#ffe4c5", createCanvas });
    expect(canvases.some((c) => c.calls.some((x) => x.fn === "fillRect"))).toBe(true);
  });

  it("is repeatable: the same seed draws identically", () => {
    const run = (seed: string) => {
      const { createCanvas, canvases } = factory();
      dieCut(src, { border: 10, shape: "torn", seed, createCanvas });
      return JSON.stringify(canvases.flatMap((c) => c.calls.map((x) => x.args.slice(1))));
    };
    expect(run("same")).toBe(run("same"));
    expect(run("same")).not.toBe(run("other"));
  });

  it("uses an injected canvas factory, so it can run in a Worker", () => {
    const create = vi.fn(factory().createCanvas);
    dieCut(src, { border: 4, createCanvas: create });
    expect(create).toHaveBeenCalled();
  });
});

describe("edgeRadius", () => {
  it("is deterministic and stays positive for every shape", () => {
    for (const shape of EDGE_SHAPES) {
      const a = edgeRadius(shape, "s", 12);
      const b = edgeRadius(shape, "s", 12);
      for (let i = 0; i < 50; i++) {
        const t = i / 50;
        expect(a(t)).toEqual(b(t));
        expect(a(t).r).toBeGreaterThan(0);
      }
    }
  });

  it("keeps smooth edges within ±6% of the border", () => {
    const r = edgeRadius("smooth", "x", 10);
    for (let i = 0; i < 100; i++) {
      expect(r(i / 100).r).toBeGreaterThanOrEqual(9.3);
      expect(r(i / 100).r).toBeLessThanOrEqual(10.7);
    }
  });

  it("only the torn shape has a lip", () => {
    expect(edgeRadius("torn", "x", 12)(0.3).f).toBeGreaterThanOrEqual(0);
    expect(edgeRadius("wobbly", "x", 12)(0.3).f).toBe(0);
    expect(edgeRadius("smooth", "x", 12)(0.3).f).toBe(0);
  });
});
