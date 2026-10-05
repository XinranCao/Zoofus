import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import "@/i18n";
import { Masthead } from "./Masthead";

const renderBar = (user: { pending?: number; invites?: number }) =>
  render(
    <MemoryRouter>
      <Masthead user={{ name: "Mei", ...user }} pathname="/stickers" />
    </MemoryRouter>,
  );

describe("Masthead: what is waiting", () => {
  it("shows a count on Friends and a mark on Together and on the phone Menu button, with names", async () => {
    renderBar({ pending: 2, invites: 1 });
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByLabelText("2 waiting")).toHaveTextContent("2");
    expect(
      within(nav).getByRole("img", { name: "1 invitation waiting" }),
    ).toBeInTheDocument();
    // the phone's one Menu button says that something is waiting inside
    const menu = screen.getByRole("button", { name: /Menu/ });
    expect(within(menu).getByRole("img", { name: "3 waiting" })).toBeInTheDocument();
    // and inside the menu, Friends carries the count too
    await userEvent.click(menu);
    const friends = await screen.findByRole("menuitem", { name: /Friends/ });
    expect(within(friends).getByLabelText("2 waiting")).toBeInTheDocument();
  });

  it("shows nothing when nothing is waiting", () => {
    renderBar({ pending: 0, invites: 0 });
    expect(screen.queryByLabelText(/waiting/)).toBeNull();
  });
});
