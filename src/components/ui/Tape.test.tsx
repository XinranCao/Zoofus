import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PatternSpec } from "@/paper/pattern";
import { PatternFill } from "./Tape";

describe("PatternFill (the one innerHTML sink)", () => {
  it("neutralises hostile pattern data that skipped the schema", () => {
    const evil =
      '"/><script>window.__pwned=1</script><img src=x onerror="window.__pwned=1">';
    const hostile = {
      kind: "doodle",
      bg: evil,
      ink: evil,
      scale: evil,
      weight: evil,
      angle: evil,
      pixels: [evil],
      strokes: [evil, `M0 0 ${evil}`],
    } as unknown as PatternSpec;
    for (const kind of ["doodle", "pixels", "dots", "wave"] as const) {
      const { container, unmount } = render(<PatternFill spec={{ ...hostile, kind }} />);
      expect(container.querySelector("script")).toBeNull();
      expect(container.querySelector("img")).toBeNull();
      expect(container.innerHTML).not.toMatch(/onerror|<script/i);
      expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
      unmount();
    }
  });

  it("a new size or angle is a new pattern (a reused id can leave the old print on screen)", () => {
    const spec: PatternSpec = {
      kind: "stripes",
      bg: "mustard-300",
      ink: "plum-900",
      scale: 12,
    };
    const { container, rerender } = render(<PatternFill spec={spec} />);
    const id = () => container.querySelector("pattern")!.id;
    const first = id();
    rerender(<PatternFill spec={{ ...spec, scale: 20 }} />);
    const second = id();
    rerender(<PatternFill spec={{ ...spec, scale: 20, angle: 90 }} />);
    expect(new Set([first, second, id()]).size).toBe(3);
  });
});
