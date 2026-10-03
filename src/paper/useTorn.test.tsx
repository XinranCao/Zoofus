import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sizeBucket, useSeed, useTorn } from "./useTorn";

type Callback = (entries: { contentRect: { width: number; height: number } }[]) => void;
let trigger: Callback | null = null;

beforeEach(() => {
  trigger = null;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(cb: Callback) {
        trigger = cb;
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

let renders = 0;
function Probe({ measure }: { measure: boolean }) {
  const seed = useSeed("probe");
  const [ref, vars] = useTorn<HTMLDivElement>(seed, { size: "md" }, measure);
  renders++;
  return <div ref={ref} data-clip={vars["--clip"].slice(0, 40)} />;
}

const resize = (width: number, height: number) =>
  act(() => trigger?.([{ contentRect: { width, height } }]));

describe("sizeBucket", () => {
  it("groups sizes into 64px buckets", () => {
    expect(sizeBucket(300, 200)).toBe(sizeBucket(310, 205));
    expect(sizeBucket(300, 200)).not.toBe(sizeBucket(700, 200));
  });
});

describe("useTorn", () => {
  it("re-renders only when the size bucket changes", () => {
    renders = 0;
    render(<Probe measure />);
    const initial = renders;
    resize(300, 200); // first measurement
    const afterFirst = renders;
    expect(afterFirst).toBeGreaterThan(initial);
    resize(305, 202); // same bucket
    resize(310, 198); // same bucket
    expect(renders).toBe(afterFirst);
    resize(700, 200); // new bucket
    expect(renders).toBe(afterFirst + 1);
  });

  it("does not observe when measure is off", () => {
    render(<Probe measure={false} />);
    expect(trigger).toBeNull();
  });
});

describe("useSeed", () => {
  it("returns the caller's seed or a stable generated one", () => {
    let seen: string[] = [];
    function S() {
      seen.push(useSeed());
      return null;
    }
    const { rerender } = render(<S />);
    rerender(<S />);
    expect(seen[0]).toBe(seen[1]);
    seen = [];
    function T() {
      seen.push(useSeed("mine"));
      return null;
    }
    render(<T />);
    expect(seen[0]).toBe("mine");
  });
});
