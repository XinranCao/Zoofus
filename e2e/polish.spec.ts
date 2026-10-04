import { expect, test } from "@playwright/test";
import { makeSticker, signUp } from "./support/flows";

test.use({ viewport: { width: 1280, height: 800 } });

test("small things: tapes rename like stickers, no preset angles, Make has no plus, the chosen language is circled", async ({
  page,
}) => {
  await signUp(page, "Mei");
  // Make has no plus beside it
  await expect(page.getByRole("button", { name: /^Make/ }).locator("svg")).toHaveCount(0);
  // the chosen language is circled by hand
  await expect(
    page.locator('.zf-lang button[aria-pressed="true"] .zf-circled').first(),
  ).toBeVisible();
  await expect(
    page.locator('.zf-lang button[aria-pressed="false"] .zf-circled'),
  ).toHaveCount(0);

  await makeSticker(page);
  await page.goto("/tapes");
  await page.getByRole("button", { name: "New tape" }).first().click();
  const dlg = page.getByRole("dialog", { name: "New tape" });
  await expect(dlg.getByRole("button", { name: /degrees/ })).toHaveCount(0);
  await dlg.getByLabel("Name").fill("Dots");
  await dlg.getByRole("button", { name: "Add to my tapes" }).click();
  await expect(page.getByText("Added to your tapes.", { exact: true })).toBeVisible();

  // a tape has the same hover actions as a sticker, including Rename
  const tile = page.locator(".zf-tapetile").first();
  await tile.hover();
  await tile.getByRole("button", { name: /^Rename: Dots/ }).click();
  const rename = page.getByRole("dialog", { name: "Rename tape" });
  await rename.getByLabel("Name").fill("Spots");
  await rename.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Spots").first()).toBeVisible();
});
