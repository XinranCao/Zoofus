import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import "@/i18n";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Paper } from "./Paper";
import { Select } from "./Select";
import { Slider } from "./Slider";
import { TextField } from "./TextField";
import { ToastProvider, useToast } from "./Toast";
import { ToggleGroup } from "./ToggleGroup";

describe("Button", () => {
  it("is a torn wrapper (clip variables) with a face inside", () => {
    render(<Button seed="b">Save</Button>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn.style.getPropertyValue("--clip")).toMatch(/^polygon\(/);
    expect(btn.style.getPropertyValue("--fclip")).toMatch(/^polygon\(/);
    expect(btn.querySelector(".zf-face")).not.toBeNull();
  });

  it("does not fire onClick when disabled or loading, and says so with ARIA", async () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <Button disabled onClick={onClick}>
        Go
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAttribute("aria-disabled", "true");
    rerender(
      <Button loading onClick={onClick}>
        Go
      </Button>,
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("is never rotated when quiet or disabled", () => {
    render(
      <>
        <Button variant="quiet" seed="q">
          Quiet
        </Button>
        <Button disabled seed="d">
          Off
        </Button>
      </>,
    );
    expect(
      screen.getByRole("button", { name: "Quiet" }).style.getPropertyValue("--rot"),
    ).toBe("0deg");
    expect(
      screen.getByRole("button", { name: "Off" }).style.getPropertyValue("--rot"),
    ).toBe("0deg");
  });

  it("uses no border, border-radius or shadow in inline styles", () => {
    render(<Button seed="flat">Flat</Button>);
    const style = screen.getByRole("button").getAttribute("style") ?? "";
    expect(style).not.toMatch(/border|shadow/);
  });
});

describe("Paper", () => {
  it("keeps the tear stable for a seed and different between seeds", () => {
    render(
      <>
        <Paper seed="one" data-testid="a" />
        <Paper seed="one" data-testid="b" />
        <Paper seed="two" data-testid="c" />
      </>,
    );
    const clip = (id: string) => screen.getByTestId(id).style.getPropertyValue("--clip");
    expect(clip("a")).toBe(clip("b"));
    expect(clip("a")).not.toBe(clip("c"));
  });

  it("drops the fibre lip when fiber is false", () => {
    render(
      <>
        <Paper seed="lip" data-testid="with" />
        <Paper seed="lip" fiber={false} data-testid="without" />
      </>,
    );
    const f = (id: string) => screen.getByTestId(id).style.getPropertyValue("--fclip");
    expect(f("with")).not.toBe(f("without"));
  });
});

describe("TextField", () => {
  it("associates the label, hint and error with the input", () => {
    render(<TextField label="Email" hint="We never share it." seed="e" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAccessibleDescription("We never share it.");
  });

  it("marks the input invalid and announces the error", () => {
    render(<TextField label="Name" error="Enter a name." seed="n" />);
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a name.");
  });

  it("passes native props through (react-hook-form register)", async () => {
    const onChange = vi.fn();
    render(<TextField label="Nick" name="nick" onChange={onChange} seed="p" />);
    await userEvent.type(screen.getByLabelText("Nick"), "ab");
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText("Nick")).toHaveAttribute("name", "nick");
  });
});

describe("ToggleGroup", () => {
  function Group() {
    const [v, setV] = useState("a");
    return (
      <ToggleGroup
        label="Mode"
        value={v}
        onChange={setV}
        seed="g"
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
          { value: "c", label: "Gamma" },
        ]}
      />
    );
  }

  it("is a labelled radiogroup with one selected option", () => {
    render(<Group />);
    expect(screen.getByRole("radiogroup", { name: "Mode" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Alpha/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Beta/ })).not.toBeChecked();
  });

  it("selects on click and moves with the arrow keys", async () => {
    render(<Group />);
    await userEvent.click(screen.getByRole("radio", { name: /Beta/ }));
    expect(screen.getByRole("radio", { name: /Beta/ })).toBeChecked();
    screen.getByRole("radio", { name: /Beta/ }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: /Gamma/ })).toHaveFocus();
  });
});

describe("Slider", () => {
  it("shows the value and responds to the arrow keys", async () => {
    function S() {
      const [v, setV] = useState(10);
      return (
        <Slider
          label="Size"
          value={v}
          onChange={setV}
          min={0}
          max={100}
          unit=" px"
          seed="s"
        />
      );
    }
    render(<S />);
    const thumb = screen.getByRole("slider", { name: "Size" });
    expect(screen.getByText("10 px")).toBeInTheDocument();
    thumb.focus();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    expect(screen.getByText("12 px")).toBeInTheDocument();
  });
});

describe("Dialog", () => {
  function Demo({ onClose }: { onClose: () => void }) {
    const [open, setOpen] = useState(true);
    return (
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) onClose();
        }}
        title="Reset your password"
        seed="dlg"
      >
        <TextField label="Email" seed="de" />
      </Dialog>
    );
  }

  it("is a named modal and closes with Escape", async () => {
    const onClose = vi.fn();
    render(<Demo onClose={onClose} />);
    expect(
      screen.getByRole("dialog", { name: "Reset your password" }),
    ).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes from the labelled close button", async () => {
    const onClose = vi.fn();
    render(<Demo onClose={onClose} />);
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("traps focus inside the dialog", async () => {
    render(
      <>
        <button>outside</button>
        <Demo onClose={() => {}} />
      </>,
    );
    for (let i = 0; i < 6; i++) await userEvent.tab();
    expect(screen.getByRole("dialog")).toContainElement(
      document.activeElement as HTMLElement,
    );
  });
});

describe("Toast", () => {
  function Trigger() {
    const toast = useToast();
    return (
      <>
        <button onClick={() => toast.push({ kind: "success", title: "Saved" })}>
          ok
        </button>
        <button onClick={() => toast.push({ kind: "error", title: "Failed" })}>
          bad
        </button>
      </>
    );
  }

  it("announces success as status and errors as alert", async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByText("ok"));
    await userEvent.click(screen.getByText("bad"));
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Failed");
  });

  it("stays at least 8 s, goes with its close button or Esc", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      render(
        <ToastProvider>
          <Trigger />
        </ToastProvider>,
      );
      await userEvent.click(screen.getByText("ok"));
      expect(await screen.findByText("Saved")).toBeInTheDocument();
      act(() => void vi.advanceTimersByTime(7500));
      expect(screen.getByText("Saved")).toBeInTheDocument(); // still there after 7.5 s
      await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
      await waitFor(() => expect(screen.queryByText("Saved")).toBeNull());
      await userEvent.click(screen.getByText("ok"));
      expect(await screen.findByText("Saved")).toBeInTheDocument();
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByText("Saved")).toBeNull());
    } finally {
      vi.useRealTimers();
    }
  });

  it("never shows more than three at once", async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    for (let i = 0; i < 5; i++) await userEvent.click(screen.getByText("bad"));
    expect(screen.getAllByText("Failed")).toHaveLength(3);
  });
});

describe("Select", () => {
  const options = [
    { value: "a", label: "Alpha", group: "g1" },
    { value: "b", label: "Beta", group: "g2" },
  ];
  it("shows the current option, lists them in groups and reports a pick", async () => {
    const onChange = vi.fn();
    render(
      <Select
        label="Letter"
        value="a"
        options={options}
        groupLabels={{ g1: "First", g2: "Second" }}
        onChange={onChange}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Letter: Alpha" });
    await userEvent.click(trigger);
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: "Alpha" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await userEvent.click(screen.getByRole("menuitemradio", { name: "Beta" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });
});

describe("Dialog focus", () => {
  it("returns focus to the control that opened it, and to the page if that is gone", async () => {
    const user = userEvent.setup();
    function Host() {
      const [open, setOpen] = useState(false);
      const [gone, setGone] = useState(false);
      return (
        <>
          <main id="main" tabIndex={-1} />
          {!gone && <button onClick={() => setOpen(true)}>Open it</button>}
          <Dialog open={open} onOpenChange={setOpen} title="Hello">
            <button onClick={() => setGone(true)}>Remove opener</button>
          </Dialog>
        </>
      );
    }
    render(<Host />);
    const opener = screen.getByRole("button", { name: "Open it" });
    await user.click(opener);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(opener).toHaveFocus());
    await user.click(opener);
    await user.click(screen.getByRole("button", { name: "Remove opener" }));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(document.getElementById("main")).toHaveFocus());
  });
});
