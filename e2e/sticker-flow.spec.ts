import { expect, test } from "@playwright/test";
import { solidPng } from "./png";

// Signs up, cuts a sticker, saves it, finds it in the sticker book, then deletes the account.
test("sign up, cut and save a sticker, then delete the account", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  // Sign up (step 1: credentials, step 2: profile)
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Preferred Name").fill("E2E Tester");
  await page.getByRole("button", { name: "Finish Signup" }).click();
  await expect(page.getByRole("heading", { name: "Welcome to Zoofus!" })).toBeVisible();

  // Open the editor and load a photo
  await page.getByRole("button", { name: "Start Image Lasso Selection" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "photo.png",
    mimeType: "image/png",
    buffer: solidPng(400, 300, [90, 140, 200]),
  });

  // Add a rectangle selection and confirm
  await page.getByRole("button", { name: "Rectangle" }).click();
  await page.getByRole("button", { name: "Add Shape" }).click();
  await page.getByRole("button", { name: "Confirm Selection" }).click();
  await expect(page.getByAltText("Cut-out sticker preview")).toBeVisible();

  // Save it
  await page.getByLabel("Sticker name").fill("Blue square");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved to My Stickers.")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  // It shows up in the sticker book
  await page.goto("/stickers");
  await expect(page.getByText("Blue square")).toBeVisible();

  // Preview: opens a dialog with the sticker, zoom changes the level, Escape closes it
  await page.getByRole("button", { name: "Preview Blue square" }).click();
  const preview = page.getByRole("dialog", { name: "Blue square" });
  await expect(preview.getByAltText("Blue square")).toBeVisible();
  await expect(preview.locator("output")).toHaveText("100%");
  await preview.getByRole("button", { name: "Zoom in" }).click();
  await expect(preview.locator("output")).not.toHaveText("100%");
  await preview.getByRole("button", { name: "Reset" }).click();
  await expect(preview.locator("output")).toHaveText("100%");
  await page.keyboard.press("Escape");
  await expect(preview).toBeHidden();

  // Rename, then delete the sticker
  await page.getByRole("button", { name: "Rename Blue square" }).click();
  const dialog = page.getByRole("dialog", { name: "Rename sticker" });
  await dialog.getByLabel("Name").fill("Renamed");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Renamed")).toBeVisible();
  await page.getByRole("button", { name: "Delete Renamed" }).click();
  await expect(page.getByText(/No stickers yet/)).toBeVisible();

  // Delete the account: everything is removed and we land on sign-up
  await page.goto("/account");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: "Delete everything" }).click();
  // Signing out redirects through the protected route, so either public page is correct.
  await expect(page).toHaveURL(/\/(login|signup)/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: /Login|Sign Up/ })).toBeVisible();
});

test("signed-out visitors are sent to the login page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("unknown routes show the 404 page", async ({ page }) => {
  await page.goto("/definitely-not-a-page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});
