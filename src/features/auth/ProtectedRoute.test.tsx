import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "./ProtectedRoute";
import * as useAuthModule from "./useAuth";

const renderAt = (currentUser: unknown) => {
  vi.spyOn(useAuthModule, "useAuth").mockReturnValue({ currentUser } as ReturnType<
    typeof useAuthModule.useAuth
  >);
  return render(
    <MemoryRouter initialEntries={["/secret"]}>
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route
          path="/secret"
          element={
            <ProtectedRoute>
              <p>secret page</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
};

describe("ProtectedRoute", () => {
  it("redirects signed-out visitors to /login", () => {
    renderAt(null);
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("shows the page to signed-in users", () => {
    renderAt({ uid: "u1" });
    expect(screen.getByText("secret page")).toBeInTheDocument();
  });
});
