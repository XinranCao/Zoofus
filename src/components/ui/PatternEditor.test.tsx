import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import "@/i18n";
import {
  BLANK_PIXELS,
  PATTERN_KINDS,
  STROKE_PATTERN,
  USER_COLORS,
  type PatternSpec,
} from "@/paper/pattern";
import { patternSpecSchema } from "@/paper/patternSchema";
import { DoodlePad, PatternEditor, PixelGrid } from "./PatternEditor";

/** The editor is controlled: this keeps the value and records every output. */
function Harness({
  initial,
  seen,
}: {
  initial: Partial<PatternSpec>;
  seen: PatternSpec[];
}) {
  const [v, setV] = useState<Partial<PatternSpec>>(initial);
  return (
    <PatternEditor
      label="Print"
      value={v}
      onChange={(s) => {
        seen.push(s);
        setV(s);
      }}
    />
  );
}
const last = (seen: PatternSpec[]) => seen[seen.length - 1]!;

describe("PatternEditor", () => {
  it.each(PATTERN_KINDS)(
    "choosing %s outputs a valid spec of that kind",
    async (kind) => {
      const seen: PatternSpec[] = [];
      render(
        <Harness
          initial={{ kind: kind === "stripes" ? "dots" : "stripes" }}
          seen={seen}
        />,
      );
      await userEvent.click(
        screen.getByRole("radio", { name: new RegExp(`^${kind}$`, "i") }),
      );
      expect(last(seen).kind).toBe(kind);
      expect(patternSpecSchema.safeParse(last(seen)).success).toBe(true);
    },
  );

  it("maps Paper and Ink to bg and ink, from the 16 user colours only", async () => {
    const seen: PatternSpec[] = [];
    render(<Harness initial={{ kind: "stripes" }} seen={seen} />);
    expect(
      within(screen.getByRole("radiogroup", { name: "Paper colour" })).getAllByRole(
        "radio",
      ),
    ).toHaveLength(16);
    await userEvent.click(
      within(screen.getByRole("radiogroup", { name: "Paper colour" })).getByRole(
        "radio",
        { name: "Brick" },
      ),
    );
    expect(last(seen).bg).toBe("brick-600");
    await userEvent.click(
      within(screen.getByRole("radiogroup", { name: "Ink colour" })).getByRole("radio", {
        name: "Moss",
      }),
    );
    expect(last(seen).ink).toBe("moss-700");
    for (const name of [last(seen).bg, last(seen).ink])
      expect(USER_COLORS).toContain(name);
  });

  it("maps Size to scale within 6 to 28", async () => {
    const seen: PatternSpec[] = [];
    render(<Harness initial={{ kind: "stripes", scale: 12 }} seen={seen} />);
    const size = screen.getByRole("slider", { name: /^Size/ });
    size.focus();
    await userEvent.keyboard("{End}");
    expect(last(seen).scale).toBe(28);
    await userEvent.keyboard("{Home}");
    expect(last(seen).scale).toBe(6);
  });

  it("maps Turn to angle (0 to 180) and Weight to weight (0.1 to 0.9)", async () => {
    const seen: PatternSpec[] = [];
    render(<Harness initial={{ kind: "stripes" }} seen={seen} />);
    screen.getByRole("slider", { name: /^Turn/ }).focus();
    await userEvent.keyboard("{End}");
    expect(last(seen).angle).toBe(180);
    screen.getByRole("slider", { name: /^Weight/ }).focus();
    await userEvent.keyboard("{Home}");
    expect(last(seen).weight).toBe(0.1);
    await userEvent.keyboard("{End}");
    expect(last(seen).weight).toBe(0.9);
  });

  it("a solid print has colour only: no ink, size, turn or weight", async () => {
    render(<Harness initial={{ kind: "solid" }} seen={[]} />);
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.queryByRole("radiogroup", { name: "Ink colour" })).toBeNull();
  });
});

describe("PixelGrid", () => {
  const setup = (value = BLANK_PIXELS) => {
    const onChange = vi.fn();
    const utils = render(
      <PixelGrid value={value} bg="cream-100" ink="brick-600" onChange={onChange} />,
    );
    return { onChange, ...utils };
  };
  const cell = (row: number, col: number) =>
    screen.getByRole("button", { name: `Row ${row} column ${col}` });

  it("has 8 × 8 cells", () => {
    setup();
    expect(screen.getAllByRole("button")).toHaveLength(64);
  });

  it("toggles a cell with a click", async () => {
    const { onChange } = setup();
    await userEvent.click(cell(1, 1));
    expect(onChange).toHaveBeenLastCalledWith(["10000000", ...BLANK_PIXELS.slice(1)]);
  });

  it("toggles with Space and with Enter", async () => {
    const { onChange } = setup();
    cell(2, 3).focus();
    await userEvent.keyboard(" ");
    expect(onChange).toHaveBeenLastCalledWith([
      BLANK_PIXELS[0],
      "00100000",
      ...BLANK_PIXELS.slice(2),
    ]);
    onChange.mockClear();
    cell(8, 8).focus();
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith([...BLANK_PIXELS.slice(0, 7), "00000001"]);
  });

  it("turns a lit cell off again", async () => {
    const { onChange } = setup(["11111111", ...BLANK_PIXELS.slice(1)]);
    await userEvent.click(cell(1, 2));
    expect(onChange).toHaveBeenLastCalledWith(["10111111", ...BLANK_PIXELS.slice(1)]);
  });

  it("paints every cell the pointer is dragged across", () => {
    const { onChange } = setup();
    const grid = screen.getByRole("group");
    const at = vi.fn();
    document.elementFromPoint = at; // jsdom has no layout, so the hit test is scripted
    fireEvent.pointerDown(cell(1, 1), { button: 0 });
    for (const c of [cell(1, 2), cell(1, 3)]) {
      at.mockReturnValueOnce(c);
      fireEvent.pointerMove(grid, { clientX: 1, clientY: 1 });
    }
    fireEvent.pointerUp(grid);
    expect(onChange).toHaveBeenLastCalledWith(["11100000", ...BLANK_PIXELS.slice(1)]);
    // @ts-expect-error restore jsdom's missing implementation
    delete document.elementFromPoint;
  });

  it("a drag that starts on a lit cell erases", () => {
    const { onChange } = setup(["11110000", ...BLANK_PIXELS.slice(1)]);
    const grid = screen.getByRole("group");
    const at = vi.fn();
    document.elementFromPoint = at; // jsdom has no layout, so the hit test is scripted
    fireEvent.pointerDown(cell(1, 1), { button: 0 });
    at.mockReturnValueOnce(cell(1, 2));
    fireEvent.pointerMove(grid, { clientX: 1, clientY: 1 });
    fireEvent.pointerUp(grid);
    expect(onChange).toHaveBeenLastCalledWith(["00110000", ...BLANK_PIXELS.slice(1)]);
    // @ts-expect-error restore jsdom's missing implementation
    delete document.elementFromPoint;
  });
});

describe("PatternEditor pixels", () => {
  it("Clear blanks the grid", async () => {
    const seen: PatternSpec[] = [];
    render(<Harness initial={{ kind: "pixels" }} seen={seen} />);
    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(last(seen).pixels).toEqual(BLANK_PIXELS);
  });
});

describe("DoodlePad", () => {
  const setup = (value: string[] = []) => {
    const onChange = vi.fn();
    render(
      <DoodlePad
        value={value}
        bg="cream-100"
        ink="brick-600"
        weight={0.5}
        onChange={onChange}
      />,
    );
    const pad = screen.getByRole("img", { name: /Doodle tile/ });
    vi.spyOn(pad, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 144,
      height: 144,
      right: 144,
      bottom: 144,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    return { onChange, pad };
  };

  it("one down-move-up makes exactly one valid stroke", () => {
    const { onChange, pad } = setup();
    fireEvent.pointerDown(pad, { clientX: 30, clientY: 30 });
    fireEvent.pointerMove(pad, { clientX: 60, clientY: 50 });
    fireEvent.pointerMove(pad, { clientX: 90, clientY: 100 });
    fireEvent.pointerUp(pad);
    expect(onChange).toHaveBeenCalledTimes(1);
    const strokes = onChange.mock.calls[0]![0] as string[];
    expect(strokes).toHaveLength(1);
    expect(strokes[0]).toMatch(STROKE_PATTERN);
    expect(strokes[0]).toBe("M10 10 L20 16.7 L30 33.3");
  });

  it("Undo removes the last stroke", async () => {
    const { onChange } = setup(["M1 1 L2 2", "M3 3 L4 4"]);
    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onChange).toHaveBeenLastCalledWith(["M1 1 L2 2"]);
  });

  it("Clear removes every stroke", async () => {
    const { onChange } = setup(["M1 1 L2 2", "M3 3 L4 4"]);
    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("stops at 60 strokes", () => {
    const { onChange, pad } = setup(new Array(60).fill("M1 1 L2 2"));
    fireEvent.pointerDown(pad, { clientX: 30, clientY: 30 });
    fireEvent.pointerMove(pad, { clientX: 60, clientY: 50 });
    fireEvent.pointerUp(pad);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("stops growing a stroke at 2,000 characters", () => {
    const { onChange, pad } = setup();
    fireEvent.pointerDown(pad, { clientX: 0, clientY: 0 });
    for (let i = 0; i < 600; i++)
      fireEvent.pointerMove(pad, {
        clientX: (i % 144) + 1,
        clientY: ((i * 7) % 144) + 1,
      });
    fireEvent.pointerUp(pad);
    const stroke = (onChange.mock.calls[0]![0] as string[])[0]!;
    expect(stroke.length).toBeLessThanOrEqual(2000);
    expect(stroke).toMatch(STROKE_PATTERN);
  });
});
