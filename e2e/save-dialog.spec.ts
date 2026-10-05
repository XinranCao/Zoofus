import { expect, test } from "@playwright/test";
import { solidPng } from "./png";
import { signUp } from "./support/flows";

async function toSaveDialog(page: import("@playwright/test").Page) {
  await page.goto("/stickers?make=1");
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: solidPng(480, 360, [110, 150, 190]),
    });
  const maker = page.getByRole("dialog", { name: "Draw around it" });
  await maker.getByRole("button", { name: "Use the whole photo" }).click();
  await maker.getByRole("button", { name: "Cut it out" }).click();
  const dlg = page.getByRole("dialog", { name: "Your sticker" });
  await expect(dlg).toBeVisible();
  return dlg;
}

test.describe("phone", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("preview and every option are reachable, nothing hides behind the footer", async ({
    page,
  }) => {
    await signUp(page, "Phone");
    const dlg = await toSaveDialog(page);
    const scroller = dlg.locator(".zf-dialog__scroll");
    const actions = dlg.locator(".zf-dialog__actions");
    const preview = dlg.getByRole("img", { name: "Sticker preview" });

    const sbox = (await scroller.boundingBox())!;
    const pbox = (await preview.boundingBox())!;
    expect(pbox.height).toBeLessThanOrEqual(667 * 0.4); // about 40% of the screen
    expect(pbox.y).toBeGreaterThanOrEqual(sbox.y - 1);

    // scroll to the very end: the last option is above the pinned footer, the preview still shows
    await scroller.evaluate((el) => (el.scrollTop = el.scrollHeight));
    const last = dlg.getByRole("slider").last();
    const lbox = (await last.boundingBox())!;
    const abox = (await actions.boundingBox())!;
    expect(lbox.y + lbox.height).toBeLessThanOrEqual(abox.y + 1);
    const after = (await preview.boundingBox())!;
    expect(after.y).toBeGreaterThanOrEqual(sbox.y - 1);
    expect(after.y + after.height).toBeLessThanOrEqual(sbox.y + sbox.height + 1);
    await expect(dlg.getByRole("radio", { name: "Torn" })).toBeAttached();
    await dlg.getByRole("radio", { name: "Torn" }).scrollIntoViewIfNeeded();
    const tbox = (await dlg.getByRole("radio", { name: "Torn" }).boundingBox())!;
    expect(tbox.y + tbox.height).toBeLessThanOrEqual(abox.y + 1);
  });
});

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("Save to Library is the primary button, Download PNG a quiet one; then See it and Make another", async ({
    page,
  }) => {
    await signUp(page, "Primary");
    const dlg = await toSaveDialog(page);
    const save = dlg.getByRole("button", { name: "Save to Library" });
    await expect(save).toHaveClass(/\bprimary\b/);
    await expect(dlg.getByRole("button", { name: "Download PNG" })).toHaveClass(
      /\bquiet\b/,
    );
    await save.click();
    await expect(dlg.getByText("Saved to your Library.", { exact: true })).toBeVisible();
    await expect(dlg.getByRole("button", { name: "See it in Library" })).toHaveClass(
      /\bprimary\b/,
    );
    await expect(dlg.getByRole("button", { name: "Download PNG" })).toHaveClass(
      /\bquiet\b/,
    );
    await dlg.getByRole("button", { name: "Make another" }).click();
    await expect(page.getByRole("dialog", { name: "Make a sticker" })).toBeVisible();
  });
});
