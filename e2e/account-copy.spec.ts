import { expect, test } from "@playwright/test";
import { signUp } from "./support/flows";

test("the account page uses plain words and says what is kept and who sees it", async ({
  page,
}) => {
  await signUp(page, "Ada");
  await page.goto("/account");
  await expect(
    page.getByRole("heading", { name: "What we keep, and who can see it" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download my data (a file you can keep)" }),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText("JSON");
  await expect(page.getByText(/Only you can see what is in your Library/)).toBeVisible();
  await expect(
    page.getByText(/A copy a friend already kept stays with them/),
  ).toBeVisible();
});

test("the account page does not scroll sideways on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signUp(page, "Ada");
  await page.goto("/account");
  await expect(
    page.getByRole("heading", { name: "What we keep, and who can see it" }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const wide = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(wide).toBe(false);
});
