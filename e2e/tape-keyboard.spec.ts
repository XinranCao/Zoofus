import { expect, test } from "@playwright/test";
import { signUp } from "./support/flows";

test.describe("New tape dialog by keyboard", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("few tab stops to Add, and a tape can be made with the keyboard alone", async ({
    page,
  }) => {
    await signUp(page, "Key");
    await page.goto("/tapes?make=1");
    const dlg = page.getByRole("dialog", { name: "New tape" });
    await expect(dlg).toBeVisible();
    const add = dlg.getByRole("button", { name: "Add to my tapes" });
    let presses = 0;
    while (presses < 40 && !(await add.evaluate((el) => el === document.activeElement))) {
      await page.keyboard.press("Tab");
      presses++;
    }
    console.log("TAB STOPS TO ADD", presses);
    await expect(add).toBeFocused();
    expect(presses).toBeLessThanOrEqual(12);

    // the pixel grid is one stop: arrows move inside it, Space paints
    const grid = dlg.getByRole("group", { name: /pixel/i });
    const cell = grid.getByRole("button", { name: "Row 1 column 1" });
    await cell.focus();
    await page.keyboard.press("ArrowRight");
    await expect(grid.getByRole("button", { name: "Row 1 column 2" })).toBeFocused();
    await page.keyboard.press("Space");
    await expect(grid.getByRole("button", { name: "Row 1 column 2" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // name it and add it, never touching the mouse
    await dlg.getByLabel("Name").focus();
    await page.keyboard.type("Keyboard tape");
    await add.focus();
    await page.keyboard.press("Enter");
    await expect(dlg).toBeHidden();
    await expect(page.getByText("Keyboard tape").first()).toBeVisible();
  });
});

test.describe("New tape dialog on a phone", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("the preview stays in view while the colours are scrolled", async ({ page }) => {
    await signUp(page, "Phone");
    await page.goto("/tapes?make=1");
    const dlg = page.getByRole("dialog", { name: "New tape" });
    await expect(dlg).toBeVisible();
    const stage = dlg.getByRole("group", { name: "Tape preview" }).first();
    const scroller = dlg.locator(".zf-dialog__scroll");
    await scroller.evaluate((el) => (el.scrollTop = el.scrollHeight));
    const box = await stage.boundingBox();
    const view = await scroller.boundingBox();
    expect(box && view).toBeTruthy();
    expect(box!.y).toBeGreaterThanOrEqual(view!.y - 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(view!.y + view!.height + 1);
    // and Add stays reachable in the pinned row
    await expect(dlg.getByRole("button", { name: "Add to my tapes" })).toBeInViewport();
  });
});
