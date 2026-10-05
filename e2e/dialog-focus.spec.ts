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
  // (the first time the maker is opened, the dev server may find a new dependency and reload the
  // page, which closes it: open it again if so)
  await expect(async () => {
    if (!(await page.getByRole("dialog", { name: "Make a sticker" }).isVisible())) {
      await newSticker.focus();
      await page.keyboard.press("Enter");
    }
    await expect(page.getByRole("dialog", { name: "Make a sticker" })).toBeVisible({
      timeout: 6000,
    });
  }).toPass({ timeout: 40_000 });
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
  await expect(page.getByRole("dialog", { name: "Make a sticker" })).toBeVisible({
    timeout: 20_000,
  });
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

// UX-050/059: opened from the Make menu, focus goes back to the Make button; headings stay clear of
// the sticky header; after logging out the login heading has focus
test("New tape from the Make menu returns focus to Make; headings are visible; logout focuses the login heading", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  const { email } = await signUp(page, "Menu");
  const make = page.getByRole("button", { name: "Make", exact: true }).first();
  for (const how of ["Escape", "Add"]) {
    await make.click();
    await page.getByRole("menuitem", { name: "New tape" }).click();
    const dlg = page.getByRole("dialog", { name: "New tape" });
    await expect(dlg).toBeVisible();
    // the first field has focus, and Close is the last stop in the dialog
    await expect(dlg.getByLabel("Name")).toBeFocused();
    const closeLast = await dlg.evaluate((d) => {
      const stops = [...d.querySelectorAll<HTMLElement>("button,input,[tabindex='0']")].filter(
        (e) => e.tabIndex >= 0,
      );
      return stops[stops.length - 1]?.getAttribute("aria-label") === "Close";
    });
    expect(closeLast).toBe(true);
    if (how === "Escape") await page.keyboard.press("Escape");
    else {
      await dlg.getByLabel("Name").fill("Menu tape");
      await page.getByRole("button", { name: "Add to my tapes" }).click();
    }
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(make).toBeFocused();
  }

  // a heading that takes focus is fully visible under the sticky header
  await page.getByRole("link", { name: "Friends", exact: true }).first().click();
  const h1 = page.getByRole("heading", { level: 1 }).first();
  await expect(h1).toBeFocused();
  const bar = (await page.locator(".zf-masthead").first().boundingBox())!;
  const box = (await h1.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(bar.y + bar.height - 1);

  // log out: the login heading has focus
  await page.getByRole("button", { name: /Account menu for/ }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  void email;
});
