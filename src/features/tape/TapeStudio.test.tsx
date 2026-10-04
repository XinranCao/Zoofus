import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import "@/i18n";
import { DEFAULT_DRAFT, TapeStudio, type TapeDraft } from "./TapeStudio";

function Harness({ onAdd = vi.fn() }) {
  const [draft, setDraft] = useState<TapeDraft>({ ...DEFAULT_DRAFT, angle: 0 });
  return (
    <TapeStudio
      draft={draft}
      onDraft={(p) => setDraft((d) => ({ ...d, ...p }))}
      defaultName="My tape 1"
      onAdd={onAdd}
      adding={false}
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

  it("adds to the collection with the typed name, or a default one", async () => {
    const onAdd = vi.fn();
    render(<Harness onAdd={onAdd} />);
    await userEvent.click(screen.getByRole("button", { name: "Add to my tapes" }));
    expect(onAdd).toHaveBeenLastCalledWith("My tape 1");
    await userEvent.type(screen.getByLabelText("Name"), "Birthday");
    await userEvent.click(screen.getByRole("button", { name: "Add to my tapes" }));
    expect(onAdd).toHaveBeenLastCalledWith("Birthday");
  });

  it("lists the three tape ends as a radiogroup", () => {
    render(<Harness />);
    const ends = screen.getByRole("radiogroup", { name: "Tape ends" });
    expect(ends).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Pinked/ })).toBeInTheDocument();
  });
});
