import { describe, expect, it } from "vitest";
import { rng } from "./random";
import {
  TEAR,
  cutEdge,
  resolveOptions,
  tearEdge,
  tornCacheSize,
  tornClip,
  tornPair,
  tornVars,
} from "./torn";

describe("tornPair", () => {
  it("is deterministic for a seed and options", () => {
    expect(tornPair("btn", { size: "sm" })).toEqual(tornPair("btn", { size: "sm" }));
  });

  it("differs between seeds, so no two scraps match", () => {
    expect(tornPair("a", { size: "md" }).face).not.toBe(
      tornPair("b", { size: "md" }).face,
    );
  });

  it("returns face and fiber polygons", () => {
    const { face, fiber } = tornPair("poly", { size: "lg" });
    expect(face.startsWith("polygon(")).toBe(true);
    expect(fiber.startsWith("polygon(")).toBe(true);
    expect(face).not.toBe(fiber);
  });

  it("builds the same number of points for face and fiber", () => {
    const { face, fiber } = tornPair("count", { size: "md" });
    expect(face.split(",").length).toBe(fiber.split(",").length);
  });

  it("with edges 'b' + flush, the top corners sit exactly on the box", () => {
    const { face, fiber } = tornPair("mast", {
      size: "xl",
      edges: "b",
      flush: true,
      w: 1280,
      h: 90,
    });
    expect(face.startsWith("polygon(0px 0px,")).toBe(true);
    expect(fiber.startsWith("polygon(0px 0px,")).toBe(true);
    expect(face).toContain("calc(100% - 0px) ");
  });

  it("reuses the cache for sizes in the same 64px bucket", () => {
    const a = tornPair("bucket", { size: "md", w: 300, h: 200 });
    const before = tornCacheSize();
    const b = tornPair("bucket", { size: "md", w: 310, h: 205 });
    expect(b).toBe(a);
    expect(tornCacheSize()).toBe(before);
  });

  it("builds a new polygon when the size bucket changes", () => {
    const a = tornPair("grow", { size: "md", w: 300, h: 200 });
    const b = tornPair("grow", { size: "md", w: 700, h: 200 });
    expect(b.face).not.toBe(a.face);
  });

  it("exposes tornClip and tornVars", () => {
    expect(tornClip("v", { size: "sm" })).toBe(tornPair("v", { size: "sm" }).face);
    const vars = tornVars("v", { size: "sm" });
    expect(vars["--clip"]).toBe(tornPair("v", { size: "sm" }).face);
    expect(vars["--fclip"]).toBe(tornPair("v", { size: "sm" }).fiber);
  });

  it("keeps about a third of 'auto' scraps with one cut edge", () => {
    let withCut = 0;
    const n = 120;
    for (let i = 0; i < n; i++) {
      const o = resolveOptions({ size: "md", edges: "auto" });
      void o;
      const p = tornPair("auto" + i, { size: "md", edges: "auto" });
      // a cut edge has only 3 points; a fully torn scrap has far more points per side
      if (
        p.face.split(",").length <
        tornPair("auto" + i, { size: "md", edges: "trbl" }).face.split(",").length
      ) {
        withCut++;
      }
    }
    expect(withCut).toBeGreaterThan(n * 0.2);
    expect(withCut).toBeLessThan(n * 0.5);
  });
});

describe("tearEdge", () => {
  const o = resolveOptions({ size: "md" });

  it("keeps the fibre outline no deeper than the face at every point", () => {
    for (let seed = 0; seed < 40; seed++) {
      for (const p of tearEdge(rng("edge" + seed), 240, o)) {
        expect(p.f).toBeLessThanOrEqual(p.d + 1e-9);
        expect(p.f).toBeGreaterThanOrEqual(-1e-9);
      }
    }
  });

  it("covers the whole edge from 0 to 1 and never goes above the box", () => {
    const pts = tearEdge(rng("cover"), 300, o);
    expect(pts[0]!.t).toBe(0);
    expect(pts.at(-1)!.t).toBe(1);
    expect(Math.min(...pts.map((p) => p.f))).toBeGreaterThanOrEqual(0);
  });

  it("wanders: depth is not constant", () => {
    const depths = tearEdge(rng("wander"), 300, o).map((p) => p.d);
    expect(Math.max(...depths) - Math.min(...depths)).toBeGreaterThan(1);
  });

  it("depth stays within a sane multiple of the preset amplitude", () => {
    for (const size of Object.keys(TEAR) as (keyof typeof TEAR)[]) {
      const opts = resolveOptions({ size });
      const pts = tearEdge(rng("amp" + size), 200, opts);
      expect(Math.max(...pts.map((p) => p.d))).toBeLessThan(
        opts.amp * 6 + opts.fiber * 2,
      );
    }
  });
});

describe("cutEdge", () => {
  it("is exactly on the box when flush", () => {
    const pts = cutEdge(rng("c"), 100, resolveOptions({ flush: true }));
    expect(pts.map((p) => p.d)).toEqual([0, 0, 0]);
  });

  it("is straight but not square otherwise", () => {
    const pts = cutEdge(rng("c2"), 100, resolveOptions({ size: "md" }));
    expect(pts).toHaveLength(3);
    expect(pts[1]!.d).toBeCloseTo((pts[0]!.d + pts[2]!.d) / 2, 10);
  });
});
