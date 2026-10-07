import { expect, test } from "@playwright/test";
import { signUp } from "./support/flows";

test.use({ viewport: { width: 1280, height: 800 } });

test("the Make menu opens its dialogs where you are, without changing the page", async ({
  page,
}) => {
  await signUp(page, "Mei");
  await page.goto("/friends");
  // (on a slow machine the bar can redraw while the menu is opening: open it again if so)
  const make = async (item: string) => {
    await expect(async () => {
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: /^Make/ }).click();
      await page
        .getByRole("menuitem", { name: item, exact: true })
        .click({ timeout: 4000 });
    }).toPass({ timeout: 30_000 });
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

  // Journal together has one entry, the top bar: it is not a second item in the Make menu
  await page.getByRole("button", { name: /^Make/ }).click();
  await expect(page.getByRole("menuitem", { name: "Journal together" })).toHaveCount(0);
  await expect(page.getByRole("menuitem")).toHaveCount(3);
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Journal together" }).first().click();
  await expect(page).toHaveURL(/\/together$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Journal together" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start a page" }).first().click();
  await expect(page.getByRole("dialog", { name: "Start a page together" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/friends");

  // the dialog opens on the Library pages too, which stay as they are
  await page.goto("/tapes");
  await make("Sticker");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/\/tapes$/);
});
