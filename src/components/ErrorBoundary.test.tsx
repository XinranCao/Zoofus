import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

function Boom(): never {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it("renders children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("all good")).toBeInTheDocument();
  });

  it("shows a fallback instead of crashing when a child throws", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong on this page.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to home" })).toBeInTheDocument();
  });
});

describe("ErrorBoundary reset", () => {
  beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it("recovers when the reset key changes (user navigates away)", () => {
    let shouldThrow = true;
    const Maybe = () => {
      if (shouldThrow) throw new Error("boom");
      return <p>recovered</p>;
    };
    const { rerender } = render(
      <ErrorBoundary resetKey="/a">
        <Maybe />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong on this page.")).toBeInTheDocument();

    shouldThrow = false;
    rerender(
      <ErrorBoundary resetKey="/b">
        <Maybe />
      </ErrorBoundary>,
    );
    expect(screen.getByText("recovered")).toBeInTheDocument();
  });
});
