import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import "@/i18n";
import { STARTER_TAPES } from "./tape.schema";
import { DEFAULT_DRAFT, TapeStudio, type TapeDraft } from "./TapeStudio";

function Harness({
  onAdd = vi.fn(),
  onRemove = vi.fn(),
  onUse = vi.fn(),
  roll = STARTER_TAPES as never[],
}) {
  const [draft, setDraft] = useState<TapeDraft>({ ...DEFAULT_DRAFT, angle: 0 });
  return (
    <TapeStudio
      draft={draft}
      onDraft={(p) => setDraft((d) => ({ ...d, ...p }))}
      roll={roll}
      onUse={onUse}
      onRemove={onRemove}
      onAdd={onAdd}
      adding={false}
    />
  );
}

describe("TapeStudio", () => {
  it("shows the angle on the handle (a slider) and in the Direction label", () => {
    render(<Harness />);
    expect(
      screen.getByRole("slider", { name: "Turn tape, now 0 degrees" }),
    ).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("Direction · 0°")).toBeInTheDocument();
  });

  it("turns the tape 5° per arrow key and stops at ±90°", async () => {
    render(<Harness />);
    const handle = screen.getByRole("slider", { name: /Turn tape/ });
    handle.focus();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    expect(
      screen.getByRole("slider", { name: "Turn tape, now 10 degrees" }),
    ).toBeInTheDocument();
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}{ArrowLeft}");
    expect(
      screen.getByRole("slider", { name: "Turn tape, now -5 degrees" }),
    ).toBeInTheDocument();
    await userEvent.keyboard("{End}{ArrowRight}");
    expect(
      screen.getByRole("slider", { name: "Turn tape, now 90 degrees" }),
    ).toBeInTheDocument();
    await userEvent.keyboard("{Home}{ArrowLeft}");
    expect(
      screen.getByRole("slider", { name: "Turn tape, now -90 degrees" }),
    ).toBeInTheDocument();
  });

  it("sets the direction from the preset chips", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "45 degrees" }));
    expect(screen.getByText("Direction · 45°")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "45 degrees" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("loads a tape from the roll when tapped", async () => {
    const onUse = vi.fn();
    render(<Harness onUse={onUse} />);
    await userEvent.click(screen.getByRole("button", { name: "Use Picnic" }));
    expect(onUse).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Picnic", ends: "pinked" }),
    );
  });

  it("adds to the roll with the typed name, or a default one", async () => {
    const onAdd = vi.fn();
    render(<Harness onAdd={onAdd} />);
    await userEvent.click(screen.getByRole("button", { name: "Add to my tape roll" }));
    expect(onAdd).toHaveBeenLastCalledWith("My tape 1");
    await userEvent.type(screen.getByLabelText("Name"), "Birthday");
    await userEvent.click(screen.getByRole("button", { name: "Add to my tape roll" }));
    expect(onAdd).toHaveBeenLastCalledWith("Birthday");
  });

  it("offers a remove button only for saved tapes", () => {
    const saved = [{ ...STARTER_TAPES[0]!, id: "t1" }, STARTER_TAPES[1]!];
    render(<Harness roll={saved as never[]} />);
    expect(
      screen.getAllByRole("button", { name: /Remove .* from the roll/ }),
    ).toHaveLength(1);
  });

  it("lists the three tape ends as a radiogroup", () => {
    render(<Harness />);
    const ends = screen.getByRole("radiogroup", { name: "Tape ends" });
    expect(ends).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Pinked/ })).toBeInTheDocument();
  });
});
