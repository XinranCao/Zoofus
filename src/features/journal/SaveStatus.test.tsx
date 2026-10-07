import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import "@/i18n";
import { SaveStatus } from "./SaveStatus";

describe("SaveStatus", () => {
  it.each([
    ["saved", "Saved"],
    ["saving", "Saving…"],
    ["pending", "Not saved yet"],
  ] as const)("says %s in a polite status", (state, text) => {
    render(<SaveStatus state={state} />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(text);
    expect(status).not.toHaveAttribute("aria-live", "assertive");
  });
});
