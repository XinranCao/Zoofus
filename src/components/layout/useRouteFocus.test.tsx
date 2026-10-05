import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useRouteFocus } from "./useRouteFocus";

function Shell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useRouteFocus(pathname);
  return (
    <>
      <button onClick={() => navigate("/b")}>go</button>
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<h1>Page A</h1>} />
          <Route path="/b" element={<h1>Page B</h1>} />
        </Routes>
      </main>
    </>
  );
}

describe("useRouteFocus", () => {
  it("leaves focus alone on first load and moves it to the new heading after navigating", async () => {
    render(
      <MemoryRouter>
        <Shell />
      </MemoryRouter>,
    );
    expect(document.activeElement).toBe(document.body);
    act(() => screen.getByRole("button", { name: "go" }).click());
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("heading", { name: "Page B" }),
      ),
    );
  });
});
