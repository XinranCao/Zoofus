import { dragOnPhoto } from "./support/draw";
import { expect, test } from "@playwright/test";
import { solidPng } from "./png";

// Signs up, cuts a sticker, picks an edge, saves it, finds it in the book, previews, renames,
// deletes with Undo, then deletes the account.
test("sign up, cut and save a sticker, then delete the account", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  // Sign up (step 1: account, step 2: profile)
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Nickname").fill("E2E Tester");
  await page.getByRole("button", { name: "Start cutting" }).click();
  await expect(page.getByRole("heading", { name: "Cut something out" })).toBeVisible();
  await expect(page).toHaveTitle("Zoofus · Make a sticker");

  // Upload from Home: the maker opens straight into the lasso step
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: solidPng(400, 300, [90, 140, 200]),
    });
  const maker = page.getByRole("dialog", { name: "Draw around it" });
  await expect(maker).toBeVisible();

  // Add a rectangle selection and cut it out
  await maker.getByRole("radio", { name: /Rectangle/ }).click();
  await dragOnPhoto(page);
  await maker.getByRole("button", { name: "Cut it out" }).click();

  // Step 2: the edge studio
  await expect(page.getByRole("dialog", { name: "Your sticker" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Sticker preview" })).toBeVisible();
  await page.getByRole("radio", { name: "Torn" }).click();
  await page.getByRole("button", { name: "Save to book" }).click();
  await expect(page.getByText("Saved to your book.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).first().click();

  // It shows up in the sticker book
  await page.goto("/stickers");
  await expect(
    page.getByRole("heading", { name: "Stickers", exact: true }),
  ).toBeVisible();
  const open = page.getByRole("button", { name: /^Open Cut / });
  await expect(open).toBeVisible();

  // Detail dialog: zoom changes the level, Reset returns to 100%, Escape closes it
  await open.click();
  const detail = page.getByRole("dialog");
  await expect(detail.locator("output")).toHaveText("100%");
  await detail.getByRole("button", { name: "Zoom in" }).click();
  await expect(detail.locator("output")).not.toHaveText("100%");
  await detail.getByRole("button", { name: "Reset" }).click();
  await expect(detail.locator("output")).toHaveText("100%");
  await page.keyboard.press("Escape");
  await expect(detail).toBeHidden();

  // Rename in place: Enter saves
  await page.getByRole("button", { name: /^Rename: Cut / }).click();
  const nameField = page.getByLabel("Name");
  await nameField.fill("Blue square");
  await nameField.press("Enter");
  await expect(page.getByText("Blue square")).toBeVisible();

  // Delete with a confirmation, then Undo brings it back
  await page.getByRole("button", { name: "Delete: Blue square" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("No stickers yet")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Blue square")).toBeVisible();

  // Tape studio: turn with the keyboard, add to the roll
  await page.goto("/tapes?make=1");
  await expect(page.getByRole("dialog", { name: "New tape" })).toBeVisible();
  const handle = page.getByRole("slider", { name: /Turn tape/ });
  await handle.focus();
  await page.keyboard.press("ArrowRight");
  await expect(handle).toHaveAttribute("aria-valuenow", "-9");
  await page.getByLabel("Name").fill("E2E tape");
  await page.getByRole("button", { name: "Add to my tapes" }).click();
  await expect(page.getByText("Added to your tapes.", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Make a tape like E2E tape" }),
  ).toBeVisible();

  // Delete the account: everything is removed and we land on a public page
  await page.goto("/account");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: "Delete everything" }).click();
  // Signing out redirects through the protected route, so either public page is correct.
  await expect(page).toHaveURL(/\/(login|signup)/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("signed-out visitors are sent to the login page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page).toHaveTitle("Zoofus · Log in");
});

test("unknown routes show the 404 page", async ({ page }) => {
  await page.goto("/definitely-not-a-page");
  await expect(
    page.getByRole("heading", { name: "This page fell out of the book" }),
  ).toBeVisible();
});
