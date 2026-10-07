import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";
import { LoadingNote } from "./Loader";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("LoadingNote", () => {
  it("is silent for a quick load, says what is loading after 300 ms and that it is slow after 3 s", () => {
    render(<LoadingNote text="Loading your journals…" />);
    const note = screen.getByRole("status");
    expect(note).toHaveTextContent("");
    act(() => void vi.advanceTimersByTime(301));
    expect(note).toHaveTextContent("Loading your journals…");
    expect(note).not.toHaveTextContent(/taking longer/);
    act(() => void vi.advanceTimersByTime(3000));
    expect(note).toHaveTextContent(
      /Loading your journals… Still working\. This is taking longer/,
    );
  });
});
