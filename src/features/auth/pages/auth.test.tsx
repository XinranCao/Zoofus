import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";
import { ToastProvider } from "@/components/ui/Toast";

const auth = vi.hoisted(() => ({
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  signup: vi.fn(),
  resetPassword: vi.fn(),
  currentUser: null as unknown,
}));
vi.mock("../useAuth", () => ({ useAuth: () => auth }));
vi.mock("@/features/profile/useProfile", () => ({
  useSaveProfile: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  useNavigate: () => navigate,
}));

import LoginPage from "./LoginPage";
import SignUpPage from "./SignUpPage";

const renderPage = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <ToastProvider>{ui}</ToastProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  auth.currentUser = null;
});

describe("LoginPage", () => {
  it("shows field errors and does not call login for empty input", async () => {
    renderPage(<LoginPage />);
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Enter a valid email.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it("logs in and goes home", async () => {
    auth.login.mockResolvedValue({});
    renderPage(<LoginPage />);
    await userEvent.type(screen.getByLabelText("Email"), "mei@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/"));
    expect(auth.login).toHaveBeenCalledWith("mei@example.com", "x");
  });

  it("explains a wrong password on the field and in an error toast", async () => {
    auth.login.mockRejectedValue({ code: "auth/invalid-credential" });
    renderPage(<LoginPage />);
    await userEvent.type(screen.getByLabelText("Email"), "mei@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "nope");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(
      await screen.findByText("Password doesn’t match this email."),
    ).toBeInTheDocument();
    expect(screen.getByText("That didn’t work")).toBeInTheDocument();
  });

  it("opens the reset dialog from Forgot password", async () => {
    renderPage(<LoginPage />);
    await userEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    expect(
      screen.getByRole("dialog", { name: "Reset your password" }),
    ).toBeInTheDocument();
  });

  it("has no tagline and one h1", () => {
    renderPage(<LoginPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
});

describe("SignUpPage", () => {
  it("requires 8 characters for a new password", async () => {
    renderPage(<SignUpPage />);
    await userEvent.type(screen.getByLabelText("Email"), "new@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "short");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Use at least 8 characters.")).toBeInTheDocument();
    expect(auth.signup).not.toHaveBeenCalled();
  });

  it("creates the account and moves to step 2", async () => {
    auth.signup.mockResolvedValue({});
    renderPage(<SignUpPage />);
    await userEvent.type(screen.getByLabelText("Email"), "new@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "longenough1");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Sign up · step 2 of 2")).toBeInTheDocument();
    expect(screen.getByLabelText(/Nickname/)).toBeInTheDocument();
  });

  it("suggests a nickname from the email, marks it needed, and an empty one is flagged on the field", async () => {
    auth.signup.mockResolvedValue({});
    renderPage(<SignUpPage />);
    await userEvent.type(screen.getByLabelText("Email"), "new.person@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "longenough1");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    const name = await screen.findByLabelText(/Nickname/);
    expect(name).toHaveValue("new.person");
    expect(name).toHaveAttribute("aria-required", "true");
    expect(screen.getByText(/friends see this name/i)).toBeInTheDocument();
    await userEvent.clear(name);
    await userEvent.click(screen.getByRole("button", { name: "Start cutting" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/nickname/i);
    expect(name).toHaveAccessibleDescription(/nickname/i);
    expect(name).toHaveFocus();
  });

  it("flags an email that is already registered on the field", async () => {
    auth.signup.mockRejectedValue({ code: "auth/email-already-in-use" });
    renderPage(<SignUpPage />);
    await userEvent.type(screen.getByLabelText("Email"), "taken@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "longenough1");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      await screen.findByText("That email already has an account."),
    ).toBeInTheDocument();
  });
});
