import { expect, test } from "@playwright/test";
import { solidPng } from "./png";
import { signUp } from "./support/flows";

// On a phone the sticker's options must not bury the preview: the preview is small and stays in
// view, shape, print and colours are drop-downs, and the pixel grid is small enough to scroll past.
test.use({ viewport: { width: 375, height: 667 }, hasTouch: true });

test("the edge studio on a phone: a small preview, drop-downs, and a small pixel grid", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signUp(page, "Phone");
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
  await maker.getByRole("button", { name: "Cut it out" }).click();
  const dlg = page.getByRole("dialog", { name: "Your sticker" });
  const preview = dlg.getByRole("img", { name: "Sticker preview" });
  await expect(preview).toBeVisible();

  // the preview is under a quarter of the screen
  const box = (await preview.boundingBox())!;
  expect(box.height).toBeLessThan(667 * 0.3);

  // shape and print are drop-downs, not rows of radio buttons
  await expect(dlg.getByRole("radio", { name: "Wobbly" })).toHaveCount(0);
  await dlg.getByRole("button", { name: /^Edge shape/ }).click();
  await page.getByRole("menuitemradio", { name: "Torn" }).click();
  await expect(dlg.getByRole("button", { name: /^Edge shape: Torn/ })).toBeVisible();
  await dlg.getByRole("button", { name: /^Pattern/ }).click();
  await page.getByRole("menuitemradio", { name: "Pixels" }).click();

  // colours are a drop-down: one button each, the swatches only when opened
  await expect(dlg.getByRole("radio", { name: "Cream" })).toHaveCount(0);
  const paper = dlg.getByRole("button", { name: /^Base colour/ });
  await paper.scrollIntoViewIfNeeded();
  await paper.click();
  await page.getByRole("radio", { name: "Pink" }).click();
  await expect(dlg.getByRole("button", { name: /^Base colour: Pink/ })).toBeVisible();

  // the pixel grid is small: a finger scrolling the page rarely lands on it
  const grid = dlg.locator(".zf-pixels");
  await grid.scrollIntoViewIfNeeded();
  const g = (await grid.boundingBox())!;
  expect(g.width).toBeLessThanOrEqual(170);
  expect(g.width / 375).toBeLessThan(0.5);
});
