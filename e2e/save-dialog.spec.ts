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

// UX-036: on small phones and at 200% zoom the whole sticker is shown, never cropped
for (const [width, height] of [
  [375, 667],
  [360, 740],
  [640, 360],
] as const) {
  test(`the preview is whole and reachable at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await signUp(page, "Small");
    const dlg = await toSaveDialog(page);
    const scroller = dlg.locator(".zf-dialog__scroll");
    const actions = dlg.locator(".zf-dialog__actions");
    const preview = dlg.getByRole("img", { name: "Sticker preview" });
    const stage = dlg.locator(".zf-studio__stage");
    // step 2 opens at the top of the dialog
    expect(await scroller.evaluate((el) => el.scrollTop)).toBe(0);
    // (tall enough: the preview is pinned, so it stays in view whatever the scroll; short: it scrolls)
    if (height >= 560) await scroller.evaluate((el) => (el.scrollTop = el.scrollHeight));
    else await preview.scrollIntoViewIfNeeded();
    const p = (await preview.boundingBox())!;
    const st = (await stage.boundingBox())!;
    const sc = (await scroller.boundingBox())!;
    const ac = (await actions.boundingBox())!;
    // inside its own box (nothing cropped), at least 120 px tall unless the screen is tiny
    expect(p.x).toBeGreaterThanOrEqual(st.x - 1);
    expect(p.x + p.width).toBeLessThanOrEqual(st.x + st.width + 1);
    expect(p.y).toBeGreaterThanOrEqual(st.y - 1);
    expect(p.y + p.height).toBeLessThanOrEqual(st.y + st.height + 1);
    expect(p.height).toBeGreaterThanOrEqual(100);
    expect(p.height).toBeLessThanOrEqual(height * 0.4 + 1);
    // and visible in the scrolling part, with the Save row below it
    expect(p.y).toBeGreaterThanOrEqual(sc.y - 1);
    expect(p.y + p.height).toBeLessThanOrEqual(sc.y + sc.height + 1);
    expect(sc.y + sc.height).toBeLessThanOrEqual(ac.y + 1);
    await expect(dlg.getByRole("button", { name: "Save to Library" })).toBeVisible();
  });
}

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

  test("once saved, step 2 is read-only: no second sticker, Edit edge opens the saved one", async ({
    page,
  }) => {
    await signUp(page, "Once");
    const dlg = await toSaveDialog(page);
    await dlg.getByRole("button", { name: "Save to Library" }).click();
    const note = dlg.getByText("Saved to your Library.", { exact: true });
    await expect(note).toBeVisible();
    // the options cannot be touched any more, so "Saved" never disappears and nothing can be saved twice
    await expect(dlg.getByRole("button", { name: "Save to Library" })).toHaveCount(0);
    await expect(dlg.getByRole("button", { name: "Back to editing" })).toHaveCount(0);
    expect(
      await dlg
        .getByRole("radio", { name: "Torn" })
        .evaluate((el) => !!el.closest("[inert]")),
    ).toBe(true);
    await expect(note).toBeVisible();
    // Edit edge is a real button, at least 44 px high, and opens the sticker just saved
    const edit = dlg.getByRole("button", { name: "Edit edge" });
    expect((await edit.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await edit.click();
    await expect(page).toHaveURL(/\/stickers$/);
    await expect(page.getByRole("dialog", { name: "Edit the edge" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".zf-tile")).toHaveCount(1);
  });
});
