import { expect, test } from "@playwright/test";
import { signUp } from "./support/flows";

test.use({ viewport: { width: 1280, height: 800 } });

test("the Make menu opens its dialogs where you are, without changing the page", async ({
  page,
}) => {
  await signUp(page, "Mei");
  await page.goto("/friends");
  const make = async (item: string) => {
    await page.getByRole("button", { name: /^Make/ }).click();
    await page.getByRole("menuitem", { name: item, exact: true }).click();
  };

  await make("Sticker");
  await expect(page.getByRole("dialog", { name: "Make a sticker" })).toBeVisible();
  await expect(page).toHaveURL(/\/friends$/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await make("Tape");
  await expect(page.getByRole("dialog", { name: "New tape" })).toBeVisible();
  await expect(page).toHaveURL(/\/friends$/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await make("Journal together");
  await expect(page.getByRole("dialog", { name: "Start a page together" })).toBeVisible();
  await expect(page).toHaveURL(/\/friends$/);
  await page.keyboard.press("Escape");

  // the dialog opens on the Library pages too, which stay as they are
  await page.goto("/tapes");
  await make("Sticker");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/\/tapes$/);
});
