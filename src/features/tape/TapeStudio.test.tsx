import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import "@/i18n";
import { DEFAULT_DRAFT, TapeStudio, type TapeDraft } from "./TapeStudio";

function Harness({ onName = vi.fn() }) {
  const [draft, setDraft] = useState<TapeDraft>({ ...DEFAULT_DRAFT, angle: 0 });
  const [name, setName] = useState("");
  return (
    <TapeStudio
      draft={draft}
      onDraft={(p) => setDraft((d) => ({ ...d, ...p }))}
      name={name}
      onName={(n) => {
        setName(n);
        onName(n);
      }}
      defaultName="My tape 1"
    />
  );
}

describe("TapeStudio", () => {
  it("shows the angle on the handle (a slider)", () => {
    render(<Harness />);
    expect(
      screen.getByRole("slider", { name: "Turn tape, now 0 degrees" }),
    ).toHaveAttribute("aria-valuenow", "0");
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

  it("has the name field before the other controls, and one tab stop for the pixel grid", async () => {
    render(<Harness />);
    const all = [...document.querySelectorAll<HTMLElement>("button,input,[role=slider]")];
    const name = screen.getByLabelText("Name");
    // everything tabbable except the turn handle comes after the name field
    const tabbable = all.filter((e) => e.tabIndex >= 0 && !e.hasAttribute("disabled"));
    const turn = screen.getByRole("slider", { name: /Turn tape/ });
    expect(tabbable.indexOf(name)).toBe(tabbable.indexOf(turn) + 1);
    const cells = screen.getAllByRole("button", { name: /^Row \d+ column \d+/ });
    expect(cells).toHaveLength(64);
    expect(cells.filter((c) => c.tabIndex === 0)).toHaveLength(1);
  });

  it("moves between pixel cells with the arrow keys and toggles with Space", async () => {
    render(<Harness />);
    const first = screen.getByRole("button", { name: "Row 1 column 1" });
    first.focus();
    await userEvent.keyboard("{ArrowRight}{ArrowDown}");
    const moved = screen.getByRole("button", { name: "Row 2 column 2" });
    expect(moved).toHaveFocus();
    expect(moved).toHaveAttribute("tabindex", "0");
    expect(moved).toHaveAttribute("aria-pressed", "true"); // the heart's cell
    await userEvent.keyboard(" ");
    expect(moved).toHaveAttribute("aria-pressed", "false");
  });

  it("lists the three tape ends as a radiogroup", () => {
    render(<Harness />);
    const ends = screen.getByRole("radiogroup", { name: "Tape ends" });
    expect(ends).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Pinked/ })).toBeInTheDocument();
  });
});
