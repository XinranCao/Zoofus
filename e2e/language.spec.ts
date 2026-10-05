import { expect, test } from "@playwright/test";
import { signUp } from "./support/flows";

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("the language lives in the account menu, with a labelled, roomy button, and it sticks", async ({
    page,
  }) => {
    await signUp(page, "Lin");
    // no language switch on the bar once you are in
    await expect(page.locator(".zf-masthead .zf-lang")).toHaveCount(0);
    // the account button shows the name and is at least 44px tall
    const acct = page.getByRole("button", { name: /Account menu for Lin/ });
    await expect(acct).toContainText("Lin");
    expect((await acct.boundingBox())!.height).toBeGreaterThanOrEqual(44);

    await acct.click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem", { name: "Log out" })).toBeVisible();
    await expect(menu.getByText("Language", { exact: true })).toBeVisible();
    await menu.getByRole("menuitemradio", { name: "中文" }).click();
    await expect(
      page.getByRole("link", { name: "资料库", exact: true }).first(),
    ).toBeVisible();

    // the choice is kept after a reload (S9)
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await expect(
      page.getByRole("link", { name: "资料库", exact: true }).first(),
    ).toBeVisible();
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("the Menu button says Menu, is 44px tall and holds the language choice", async ({
    page,
  }) => {
    await signUp(page, "Mia");
    const menuBtn = page.getByRole("button", { name: "Menu" });
    await expect(menuBtn).toBeVisible();
    expect((await menuBtn.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect(page.locator(".zf-masthead .zf-lang")).toHaveCount(0);
    await menuBtn.click();
    await expect(page.getByRole("menuitem", { name: "Log out" })).toBeVisible();
    await page.getByRole("menuitemradio", { name: "中文" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  });
});
