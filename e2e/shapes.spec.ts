import { expect, test, type Page } from "@playwright/test";
import { patternPng } from "./png";
import { dragOnPhoto } from "./support/draw";

// Shapes are drawn by dragging on the photo: no "Add shape" button.
test.use({ viewport: { width: 1280, height: 800 } });

async function openMaker(page: Page) {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(`shapes-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Nickname").fill("Shapes");
  await page.getByRole("button", { name: "Start cutting" }).click();
  await expect(page).toHaveTitle("Zoofus · Make a sticker");
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "p.png",
      mimeType: "image/png",
      buffer: patternPng(480, 360, (x, y) => [(x * 3) % 256, (y * 5) % 256, 120]),
    });
  const maker = page.getByRole("dialog", { name: "Draw around it" });
  await expect(maker).toBeVisible();
  return maker;
}

test("there is no Add shape button", async ({ page }) => {
  const maker = await openMaker(page);
  await maker.getByRole("radio", { name: /Rectangle/ }).click();
  await expect(maker.getByRole("button", { name: /Add shape/ })).toHaveCount(0);
});

for (const shape of ["Rectangle", "Triangle", "Star"] as const) {
  test(`dragging on the photo draws a ${shape.toLowerCase()}`, async ({ page }) => {
    const maker = await openMaker(page);
    const cut = maker.getByRole("button", { name: "Cut it out" });
    await expect(cut).toBeDisabled();
    await maker.getByRole("radio", { name: new RegExp(shape) }).click();
    await dragOnPhoto(page, [0.2, 0.15], [0.7, 0.85]);
    await expect(cut).toBeEnabled();
    // drawn from the opposite corner too
    await maker.getByRole("button", { name: "Reset" }).click();
    await expect(cut).toBeDisabled();
    await dragOnPhoto(page, [0.8, 0.8], [0.3, 0.2]);
    await expect(cut).toBeEnabled();
  });
}

test("a click, or a tiny drag, draws nothing", async ({ page }) => {
  const maker = await openMaker(page);
  await maker.getByRole("radio", { name: /Star/ }).click();
  await dragOnPhoto(page, [0.5, 0.5], [0.5, 0.5]);
  await dragOnPhoto(page, [0.5, 0.5], [0.505, 0.505]);
  await expect(maker.getByRole("button", { name: "Cut it out" })).toBeDisabled();
});

test("the mode decides whether a drawn shape selects or deselects", async ({ page }) => {
  const maker = await openMaker(page);
  const cut = maker.getByRole("button", { name: "Cut it out" });
  await maker.getByRole("radio", { name: /Rectangle/ }).click();
  await maker.getByRole("radio", { name: "Remove", exact: true }).click();
  await dragOnPhoto(page, [0.2, 0.2], [0.6, 0.6]);
  await expect(cut).toBeDisabled(); // only a "select" shape can be cut out
  await maker.getByRole("radio", { name: "Keep", exact: true }).click();
  await dragOnPhoto(page, [0.1, 0.65], [0.9, 0.95]);
  await expect(cut).toBeEnabled();
});

test("the keyboard adds a shape with Space", async ({ page }) => {
  const maker = await openMaker(page);
  await maker.getByRole("radio", { name: /Triangle/ }).click();
  await page.getByRole("application").focus();
  await page.keyboard.press("Space");
  await expect(maker.getByRole("button", { name: "Cut it out" })).toBeEnabled();
});

test("a drawn shape can still be moved by dragging it", async ({ page }) => {
  const maker = await openMaker(page);
  await maker.getByRole("radio", { name: /Rectangle/ }).click();
  await dragOnPhoto(page, [0.2, 0.2], [0.5, 0.5]);
  // dragging from inside the shape moves it instead of drawing a second one
  await dragOnPhoto(page, [0.35, 0.35], [0.6, 0.6]);
  await maker.getByRole("button", { name: "Cut it out" }).click();
  await expect(page.getByRole("dialog", { name: "Your sticker" })).toBeVisible();
});
