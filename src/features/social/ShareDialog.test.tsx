import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";
import { ToastProvider } from "@/components/ui/Toast";

const mutateAsync = vi.hoisted(() => vi.fn());
vi.mock("./useSocial", () => ({
  useFriends: () => ({
    data: [
      { uid: "bob", alias: undefined, since: new Date(), profile: { nickname: "Bobby" } },
    ],
    isPending: false,
  }),
  useShare: () => ({ mutateAsync }),
}));

import { ShareDialog } from "./ShareDialog";
import type { ShareSource } from "./share.api";

const sources = [
  {
    kind: "tape" as const,
    tape: {
      name: "Dots",
      pattern: { kind: "solid" as const, bg: "pink-200" as const },
      thickness: 20,
      opacity: 0.8,
      ends: "torn" as const,
    },
  },
] as unknown as ShareSource[];

function setup() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ShareDialog open sources={sources} onClose={() => {}} />
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mutateAsync.mockReset();
});

describe("ShareDialog", () => {
  it("shows progress at once, sends once however often Send is pressed, then says who it went to", async () => {
    let finish!: () => void;
    mutateAsync.mockImplementation(() => new Promise<void>((r) => (finish = r)));
    setup();
    await userEvent.click(screen.getByRole("button", { name: /Bobby/ }));
    const send = screen.getByRole("button", { name: "Send" });
    await userEvent.dblClick(send); // two quick presses
    expect(await screen.findByText("Sending to Bobby…")).toBeInTheDocument();
    expect(document.querySelector('button[aria-busy="true"]')).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(mutateAsync).toHaveBeenCalledTimes(1);
    finish();
    await waitFor(() => expect(screen.getByText("Sent to Bobby.")).toBeInTheDocument());
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });
});
