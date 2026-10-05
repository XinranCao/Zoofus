import { expect, test } from "@playwright/test";
import { makeSticker, signUp } from "./support/flows";

test.use({ viewport: { width: 1280, height: 800 } });

test("a sticker card has one caption, and the starter tapes are named in Chinese", async ({
  page,
}) => {
  await signUp(page, "Cap");
  await makeSticker(page);
  await page.goto("/stickers");
  const tile = page.locator(".zf-tile").first();
  await expect(tile.locator(".zf-tile__name")).toBeVisible();
  await expect(tile.locator(".zf-tile__meta")).toHaveCount(0);
  // the accessible name carries the visible name
  const visible = (await tile.locator(".zf-tile__name").textContent())!.trim();
  await expect(
    page.getByRole("button", { name: new RegExp(`^Open ${visible}`) }),
  ).toBeVisible();

  await page.evaluate(() => localStorage.setItem("zoofus.lang", "zh-CN"));
  await page.goto("/tapes");
  for (const name of ["粉色圆点", "青柠条纹", "野餐格子", "纸胶带"])
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Pink dots")).toHaveCount(0);
  await expect(page.getByText("Masking")).toHaveCount(0);
});
