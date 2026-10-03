import { describe, expect, it } from "vitest";
import {
  BLANK_PIXELS,
  DOODLE_STROKES,
  HEART_PIXELS,
  PALETTE,
  PATTERN_KINDS,
  TAPE_PRESETS,
  USER_COLORS,
  hex,
  patternMarkup,
  patternSVG,
  type PatternSpec,
} from "./pattern";

const base: PatternSpec = {
  kind: "stripes",
  bg: "mustard-300",
  ink: "sheet-50",
  scale: 12,
  angle: 45,
  weight: 0.4,
  pixels: HEART_PIXELS,
  strokes: DOODLE_STROKES,
};

const parse = (svg: string) => new DOMParser().parseFromString(svg, "image/svg+xml");

describe("patternSVG", () => {
  it.each(PATTERN_KINDS)("returns valid SVG markup for %s", (kind) => {
    const doc = parse(patternSVG({ ...base, kind }, 120, 80, 1));
    expect(doc.querySelector("parsererror")).toBeNull();
    expect(doc.documentElement.tagName).toBe("svg");
    expect(doc.documentElement.getAttribute("width")).toBe("120");
  });

  it("paints the paper colour first", () => {
    const doc = parse(patternSVG({ ...base, kind: "solid" }, 10, 10));
    expect(doc.querySelector("rect")?.getAttribute("fill")).toBe(PALETTE["mustard-300"]);
    expect(doc.querySelector("pattern")).toBeNull();
  });

  it("renders only filled pixel cells for the pixels kind", () => {
    const doc = parse(
      patternSVG({ ...base, kind: "pixels", pixels: HEART_PIXELS }, 50, 50),
    );
    const cells = HEART_PIXELS.join("").split("1").length - 1;
    expect(doc.querySelectorAll("pattern rect")).toHaveLength(cells);
    const blank = parse(
      patternSVG({ ...base, kind: "pixels", pixels: BLANK_PIXELS }, 50, 50),
    );
    expect(blank.querySelectorAll("pattern rect")).toHaveLength(0);
  });

  it("draws every doodle stroke", () => {
    const doc = parse(patternSVG({ ...base, kind: "doodle" }, 50, 50));
    expect(doc.querySelectorAll("pattern path")).toHaveLength(DOODLE_STROKES.length);
  });

  it("scales the repeat with k (devicePixelRatio)", () => {
    const one = patternMarkup({ ...base, kind: "dots" }, 1, "a");
    const two = patternMarkup({ ...base, kind: "dots" }, 2, "a");
    expect(one).not.toBe(two);
  });
});

describe("patternMarkup ids", () => {
  it("gives every call a unique pattern id", () => {
    const ids = new Set(
      Array.from({ length: 20 }, () => /id="([^"]+)"/.exec(patternMarkup(base))![1]),
    );
    expect(ids.size).toBe(20);
  });

  it("uses a given id for both the pattern and its reference", () => {
    const m = patternMarkup(base, 1, "mine");
    expect(m).toContain('id="mine"');
    expect(m).toContain("url(#mine)");
  });
});

describe("palette", () => {
  it("offers exactly 16 user colours, all in the palette, none fluorescent", () => {
    expect(USER_COLORS).toHaveLength(16);
    for (const c of USER_COLORS) expect(PALETTE).toHaveProperty(c);
    for (const banned of ["orange-500", "chartreuse-400", "hotpink-300", "magenta-500"]) {
      expect(USER_COLORS as readonly string[]).not.toContain(banned);
    }
  });

  it("resolves tokens to hex and passes other colours through", () => {
    expect(hex("sheet-50")).toBe("#fbf6ee");
    expect(hex("#123456")).toBe("#123456");
  });

  it("has valid tape presets", () => {
    for (const spec of Object.values(TAPE_PRESETS)) {
      expect(parse(patternSVG(spec, 10, 10)).querySelector("parsererror")).toBeNull();
    }
  });
});

describe("hostile input", () => {
  const hostile = [
    '"/><script>alert(1)</script>',
    "url(javascript:alert(1))",
    'M1 1"/><image href=x onerror=alert(1)',
    "javascript:alert(1)",
  ];

  it("drops doodle strokes that are not plain path data", () => {
    const svg = patternSVG(
      {
        kind: "doodle",
        bg: "cream-100",
        ink: "cocoa-800",
        strokes: [...hostile, "M1 1 L2 2"],
      },
      100,
      100,
    );
    expect(svg).not.toMatch(/script|javascript|onerror|<image/i);
    expect(svg.match(/<path /g)).toHaveLength(1);
  });

  it("falls back to a palette colour for unknown colour strings", () => {
    for (const h of hostile) {
      expect(hex(h)).toBe(PALETTE["sheet-50"]);
      const svg = patternSVG({ kind: "dots", bg: h as never, ink: h as never }, 50, 50);
      expect(svg).not.toMatch(/script|javascript|onerror/i);
    }
  });

  it("keeps palette names and plain hex colours", () => {
    expect(hex("brick-600")).toBe(PALETTE["brick-600"]);
    expect(hex("#abc123")).toBe("#abc123");
  });

  it("never lets hostile values through the schema", async () => {
    const { patternSpecSchema } = await import("./patternSchema");
    const doodle = patternSpecSchema.parse({
      kind: "doodle",
      bg: "cream-100",
      strokes: hostile,
    });
    expect(doodle.strokes).toEqual([]);
    // a colour that is not one of the 16 reads as paper white
    expect(patternSpecSchema.parse({ kind: "dots", bg: "url(x)" }).bg).toBe("sheet-50");
    expect(patternSpecSchema.parse({ kind: "dots", bg: "chartreuse-400" }).bg).toBe(
      "sheet-50",
    );
  });
});
