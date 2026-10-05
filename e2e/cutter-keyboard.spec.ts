import { expect, test } from "@playwright/test";
import { solidPng } from "./png";
import { signUp } from "./support/flows";

// A sticker made with the keyboard alone: after the page is open, no pointer or mouse event happens.
for (const size of [
  { width: 375, height: 667 },
  { width: 1440, height: 900 },
]) {
  test(`make and save a sticker with no pointer at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size);
    await signUp(page, "Keys");
    await page.goto("/stickers?make=1");
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: "photo.png",
        mimeType: "image/png",
        buffer: solidPng(480, 360, [110, 150, 190]),
      });
    const maker = page.getByRole("dialog", { name: "Draw around it" });
    await expect(maker).toBeVisible();

    await page.evaluate(() => {
      const w = window as unknown as { __ptr: number };
      w.__ptr = 0;
      for (const type of ["pointerdown", "mousedown", "touchstart"])
        document.addEventListener(type, (e) => e.isTrusted && w.__ptr++, true);
    });
    const cut = maker.getByRole("button", { name: "Cut it out" });
    await expect(cut).toBeDisabled();

    const canvas = page.getByRole("application");
    await canvas.focus();
    await page.keyboard.press("Enter"); // a starting selection
    await expect(cut).toBeEnabled();
    await expect(
      page.getByRole("status").filter({ hasText: "percent wide" }),
    ).toContainText("Rectangle, Select: 60 percent wide and 60 percent tall");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Shift+ArrowRight"); // wider
    await expect(
      page.getByRole("status").filter({ hasText: "percent wide" }),
    ).toContainText(/(6[1-9]|7\d) percent wide/);
    await page.keyboard.press("Shift+ArrowLeft");
    await page.keyboard.press("Delete");
    await expect(cut).toBeDisabled();
    await expect(
      page.getByRole("status").filter({ hasText: "Selection removed" }),
    ).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(cut).toBeEnabled();

    // cut it out and save it, from the keyboard
    await page.keyboard.press("Enter");
    const dlg = page.getByRole("dialog", { name: "Your sticker" });
    await expect(dlg).toBeVisible();
    const save = dlg.getByRole("button", { name: "Save to Library" });
    await save.focus();
    await page.keyboard.press("Enter");
    await expect(dlg.getByText("Saved to your Library.", { exact: true })).toBeVisible();

    expect(
      await page.evaluate(() => (window as unknown as { __ptr: number }).__ptr),
    ).toBe(0);
  });
}

test("'Use the whole photo' selects everything with one press", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signUp(page, "Whole");
  await page.goto("/stickers?make=1");
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: solidPng(480, 360, [110, 150, 190]),
    });
  const maker = page.getByRole("dialog", { name: "Draw around it" });
  await maker.getByRole("button", { name: "Use the whole photo" }).click();
  await expect(maker.getByRole("button", { name: "Cut it out" })).toBeEnabled();
  await expect(
    page.getByRole("status").filter({ hasText: "percent wide" }),
  ).toContainText("100 percent wide and 100 percent tall");
});
