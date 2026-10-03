import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { EditorStoreProvider } from "../store/editorStore";
import { EditorControls } from "./EditorControls";

const renderControls = () =>
  render(
    <EditorStoreProvider>
      <EditorControls />
    </EditorStoreProvider>,
  );

describe("EditorControls", () => {
  it("starts with nothing to confirm, undo or delete", () => {
    renderControls();
    expect(screen.getByRole("button", { name: "Confirm Selection" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  it("adds a shape, then undo removes it", async () => {
    renderControls();
    expect(screen.getByRole("button", { name: "Add Shape" })).toBeDisabled(); // freehand tool

    await userEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    await userEvent.click(screen.getByRole("button", { name: "Add Shape" }));

    expect(screen.getByRole("button", { name: "Confirm Selection" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("button", { name: "Confirm Selection" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Redo" })).toBeEnabled();
  });

  it("deletes the active shape", async () => {
    renderControls();
    await userEvent.click(screen.getByRole("button", { name: "Star" }));
    await userEvent.click(screen.getByRole("button", { name: "Add Shape" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("button", { name: "Confirm Selection" })).toBeDisabled();
  });
});
