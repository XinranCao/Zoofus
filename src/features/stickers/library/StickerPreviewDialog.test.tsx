import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const zoom = vi.hoisted(() => ({
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  resetTransform: vi.fn(),
}));

// The real library needs layout (ResizeObserver, sizes); the dialog's own behaviour is what we test.
vi.mock("react-zoom-pan-pinch", () => ({
  TransformWrapper: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TransformComponent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useControls: () => zoom,
  useTransformEffect: vi.fn(),
}));

import { StickerPreviewDialog } from "./StickerPreviewDialog";
import type { Sticker } from "./sticker.schema";

const sticker: Sticker = {
  id: "s1",
  name: "Froggo",
  storagePath: "u1/stickers/s1.webp",
  imageUrl: "https://example.com/s1.webp",
  thumbnailUrl: "https://example.com/s1_thumb.webp",
  width: 800,
  height: 600,
  createdAt: new Date("2026-10-03T00:00:00Z"),
};

beforeEach(() => vi.clearAllMocks());

describe("StickerPreviewDialog", () => {
  it("renders nothing while no sticker is selected", () => {
    render(<StickerPreviewDialog sticker={null} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the sticker's name and the full-size image (not the thumbnail)", () => {
    render(<StickerPreviewDialog sticker={sticker} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Froggo")).toBeInTheDocument();
    expect(screen.getByAltText("Froggo")).toHaveAttribute("src", sticker.imageUrl);
  });

  it("wires the zoom buttons to the zoom controls", async () => {
    render(<StickerPreviewDialog sticker={sticker} onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    await userEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(zoom.zoomIn).toHaveBeenCalledOnce();
    expect(zoom.zoomOut).toHaveBeenCalledOnce();
    expect(zoom.resetTransform).toHaveBeenCalledOnce();
  });

  it("starts at 100%", () => {
    render(<StickerPreviewDialog sticker={sticker} onClose={vi.fn()} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("closes from the close button and with Escape", async () => {
    const onClose = vi.fn();
    render(<StickerPreviewDialog sticker={sticker} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Close preview" }));
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
