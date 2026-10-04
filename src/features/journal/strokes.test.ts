import { describe, expect, it } from "vitest";
import { MAX_STROKE_CHARS } from "./journal.schema";
import {
  decodeStroke,
  distToSegment,
  erasePieces,
  encodeStroke,
  simplify,
  strokesFromLine,
  touchesStroke,
} from "./strokes";

describe("stroke encoding", () => {
  it("round-trips a line to a tenth of a unit", () => {
    const line = [10, 20, 12.4, 25.5, 300.1, -4.2, -5, 6];
    const back = decodeStroke(encodeStroke(line));
    expect(back).toHaveLength(line.length);
    back.forEach((v, i) => expect(v).toBeCloseTo(line[i]!, 1));
  });

  it("is short: a few characters per point", () => {
    const line: number[] = [];
    for (let i = 0; i < 300; i++) line.push(i * 1.7, Math.sin(i / 9) * 40 + 200);
    expect(encodeStroke(line).length).toBeLessThan(300 * 8);
  });

  it("decodes garbage to nothing rather than throwing", () => {
    expect(decodeStroke("")).toEqual([]);
    expect(decodeStroke("a")).toEqual([]);
    expect(decodeStroke("a b c")).toEqual([]);
    expect(decodeStroke("zz !! ??")).toEqual([]);
  });

  it("contains no characters that could carry markup", () => {
    const s = encodeStroke([1, 2, -30, 4, 500, -600]);
    expect(s).toMatch(/^[0-9a-z\- ]+$/);
  });
});

describe("simplify", () => {
  it("drops points on a straight line and keeps the corners", () => {
    const line = [0, 0, 5, 0, 10, 0, 10, 10];
    expect(simplify(line, 0.5)).toEqual([0, 0, 10, 0, 10, 10]);
  });
  it("keeps short lines as they are", () => {
    expect(simplify([1, 2, 3, 4], 1)).toEqual([1, 2, 3, 4]);
  });
});

describe("eraser hit test", () => {
  const line = [0, 0, 100, 0];
  it("touches within the radius of the line, not beyond", () => {
    expect(touchesStroke(line, 50, 4, 5)).toBe(true);
    expect(touchesStroke(line, 50, 8, 5)).toBe(false);
    expect(touchesStroke(line, 120, 0, 5)).toBe(false);
  });
  it("handles a dot", () => {
    expect(touchesStroke([10, 10], 12, 10, 3)).toBe(true);
    expect(touchesStroke([10, 10], 30, 10, 3)).toBe(false);
  });
  it("distance to a segment", () => {
    expect(distToSegment(5, 5, 0, 0, 10, 0)).toBe(5);
    expect(distToSegment(-3, 4, 0, 0, 10, 0)).toBe(5);
  });
});

describe("strokesFromLine", () => {
  it("makes one stroke for a short line and a dot for a click", () => {
    expect(strokesFromLine([0, 0, 50, 50, 100, 0])).toHaveLength(1);
    expect(strokesFromLine([5, 5])).toHaveLength(1);
    expect(strokesFromLine([])).toEqual([]);
  });
  it("cuts a very long line into pieces that each fit the limit and join up", () => {
    const line: number[] = [];
    for (let i = 0; i < 4000; i++) line.push(i * 3.3, (i % 2 ? 40 : -40) + (i % 7) * 11);
    const strokes = strokesFromLine(line, 0.1);
    expect(strokes.length).toBeGreaterThan(1);
    for (const s of strokes) expect(s.length).toBeLessThanOrEqual(MAX_STROKE_CHARS);
    const a = decodeStroke(strokes[0]!);
    const b = decodeStroke(strokes[1]!);
    expect(b[0]).toBeCloseTo(a[a.length - 2]!, 1);
    expect(b[1]).toBeCloseTo(a[a.length - 1]!, 1);
  });
});

describe("erasePieces", () => {
  const line = [0, 0, 100, 0];
  it("leaves a line alone when the eraser is far away", () => {
    expect(erasePieces([line], 0, 50, 100, 50, 6)).toEqual([line]);
  });
  it("rubs out only the part the eraser went over", () => {
    const out = erasePieces([line], 50, -10, 50, 10, 6);
    expect(out).toHaveLength(2);
    const [left, right] = out as [number[], number[]];
    expect(Math.max(...left.filter((_, i) => i % 2 === 0))).toBeLessThan(50);
    expect(Math.min(...right.filter((_, i) => i % 2 === 0))).toBeGreaterThan(50);
    // both halves are still most of the line
    expect(Math.max(...left.filter((_, i) => i % 2 === 0))).toBeGreaterThan(40);
    expect(Math.min(...right.filter((_, i) => i % 2 === 0))).toBeLessThan(60);
  });
  it("does not touch other lines the eraser did not reach", () => {
    const a = [0, 0, 100, 0];
    const b = [0, 40, 100, 40];
    const out = erasePieces([a, b], 50, -10, 50, 10, 6);
    expect(out).toContainEqual(b);
  });
  it("removes a line the eraser covers entirely", () => {
    expect(erasePieces([[10, 0, 20, 0]], 0, 0, 40, 0, 8)).toEqual([]);
  });
});
