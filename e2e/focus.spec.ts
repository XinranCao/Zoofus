import { expect, test } from "@playwright/test";
import { signUp } from "./support/flows";

test.use({ viewport: { width: 1280, height: 800 } });

// Keyboard focus follows the person: to the new page's heading after a route change, and back to the
// control that opened a dialog when it closes.
test("focus lands on the page heading after navigating and returns after a dialog closes", async ({
  page,
}) => {
  await signUp(page, "Kay");
  // client-side navigation (not a reload) with the keyboard: Library, then its Tapes tab
  await page.getByRole("link", { name: "Library", exact: true }).first().focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/stickers$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await page
    .getByRole("link", { name: /^Tapes/ })
    .first()
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/tapes$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();

  // a dialog opened with the keyboard gives focus back when it closes
  const make = page.getByRole("button", { name: "New tape" }).first();
  await make.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(make).toBeFocused();
});
