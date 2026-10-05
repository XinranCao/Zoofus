import { expect, test } from "@playwright/test";
import { solidPng } from "./png";
import { signUp } from "./support/flows";

test.use({ viewport: { width: 1280, height: 800 } });

// After a dialog closes, by Esc or by its main action, focus is on what opened it.
test("focus returns to the opener: New tape, the sticker save dialog, Share", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signUp(page, "Fran");

  // New tape: Esc, then Add
  await page.goto("/tapes");
  const newTape = page.getByRole("button", { name: "New tape" }).first();
  await newTape.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "New tape" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(newTape).toBeFocused();
  await page.keyboard.press("Enter");
  await page
    .getByRole("dialog", { name: "New tape" })
    .getByLabel("Name")
    .fill("Focus tape");
  await page.getByRole("button", { name: "Add to my tapes" }).click();
  await expect(page.getByText(/^Added “Focus tape” to your tapes\.$/)).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("button", { name: "New tape" }).first()).toBeFocused();

  // the sticker maker: save, then Esc closes it and focus is back on "New sticker"
  await page.goto("/stickers");
  const newSticker = page
    .getByRole("button", { name: /New sticker|Make your first sticker/ })
    .first();
  await newSticker.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Make a sticker" })).toBeVisible();
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "p.png",
      mimeType: "image/png",
      buffer: solidPng(480, 360, [120, 140, 200]),
    });
  const maker = page.getByRole("dialog", { name: "Draw around it" });
  await maker.getByRole("button", { name: "Use the whole photo" }).click();
  await maker.getByRole("button", { name: "Cut it out" }).click();
  const dlg = page.getByRole("dialog", { name: "Your sticker" });
  await dlg.getByRole("button", { name: "Save to Library" }).click();
  // the Save button goes away: focus moves to "See it in Library", not to nowhere
  await expect(dlg.getByRole("button", { name: "See it in Library" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  // the "Make your first sticker" button that opened it is gone now: focus is on the page, not lost
  await expect(page.locator("#main")).toBeFocused();
  // with a sticker in the Library the button stays, and gets the focus back
  const another = page.getByRole("button", { name: "New sticker" }).first();
  await another.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Make a sticker" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(another).toBeFocused();

  // Share
  const share = page.getByRole("button", { name: /^Share: / }).first();
  await share.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(share).toBeFocused();
});
