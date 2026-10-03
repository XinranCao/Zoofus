import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AuthForm } from "./AuthForm";

describe("AuthForm", () => {
  it("shows validation errors and does not submit invalid input", async () => {
    const onSubmit = vi.fn();
    render(<AuthForm title="Login" submitLabel="Log In" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText("Email"), "not-an-email");
    await userEvent.type(screen.getByLabelText("Password"), "123");
    await userEvent.click(screen.getByRole("button", { name: "Log In" }));

    expect(await screen.findByText("Enter a valid email")).toBeInTheDocument();
    expect(screen.getByText("At least 6 characters")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits valid credentials", async () => {
    const onSubmit = vi.fn();
    render(<AuthForm title="Login" submitLabel="Log In" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText("Email"), "leo@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "secret1");
    await userEvent.click(screen.getByRole("button", { name: "Log In" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0]).toEqual({
      email: "leo@example.com",
      password: "secret1",
    });
  });

  it("shows a server error passed in by the page", () => {
    render(
      <AuthForm
        title="Login"
        submitLabel="Log In"
        error="Failed to sign in"
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText("Failed to sign in")).toBeInTheDocument();
  });
});
