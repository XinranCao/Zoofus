import { expect, test, type Page } from "@playwright/test";
import { patternPng } from "./png";

// A dialog never grows past the screen and has exactly one scrolling part. Its title and its
// action buttons stay in view while the middle scrolls, and the page behind does not scroll.
async function signUp(page: Page) {
  await page.goto("/signup");
  await page
    .getByLabel("Email")
    .fill(`scroll-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Nickname · 昵称").fill("Scroll");
  await page.getByRole("button", { name: "Start cutting" }).click();
  await expect(page).toHaveTitle("Zoofus · Make a sticker");
}

async function toEdgeStudio(page: Page) {
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "p.png",
      mimeType: "image/png",
      buffer: patternPng(480, 360, (x, y) => [(x * 3) % 256, (y * 5) % 256, 150]),
    });
  const maker = page.getByRole("dialog", { name: "Draw around it" });
  await maker.getByRole("radio", { name: /Rectangle/ }).click();
  // the keyboard way to add a shape: it works whatever part of the photo is on screen
  await page.getByRole("application").focus();
  await page.keyboard.press("Space");
  await maker.getByRole("button", { name: "Cut it out" }).click();
  const result = page.getByRole("dialog", { name: "Your sticker" });
  await expect(result).toBeVisible();
  await page.getByRole("radio", { name: "Pixels" }).click(); // the tallest content there is
  return result;
}

/** Everything that must hold for the open dialog. */
async function expectWellBehaved(page: Page, actionName: RegExp | string) {
  const dialog = page.getByRole("dialog");
  const scroll = dialog.locator(".zf-dialog__scroll");
  const view = page.viewportSize()!;

  const box = (await dialog.boundingBox())!;
  expect(box.y, "the top of the dialog is on screen").toBeGreaterThanOrEqual(-1);
  expect(box.y + box.height, "the bottom of the dialog is on screen").toBeLessThanOrEqual(
    view.height + 1,
  );
  await expect(dialog.getByRole("heading").first()).toBeInViewport();
  const action = dialog.getByRole("button", { name: actionName }).last();
  await expect(
    action,
    "the action button is visible before any scrolling",
  ).toBeInViewport({ ratio: 0.9 });

  // exactly one scroll container: the dialog's middle; the page and the positioner do not scroll
  const metrics = await page.evaluate(() => {
    const pos = document.querySelector<HTMLElement>(".zf-dialog-pos")!;
    return {
      positionerOverflow: pos.scrollHeight - pos.clientHeight,
      pageOverflow:
        document.documentElement.scrollHeight - document.documentElement.clientHeight,
      bodyOverflow: getComputedStyle(document.body).overflow,
    };
  });
  expect(metrics.positionerOverflow).toBeLessThanOrEqual(1);
  expect(metrics.bodyOverflow).toBe("hidden");

  const overflow = await scroll.evaluate((el) => el.scrollHeight - el.clientHeight);
  if (overflow > 2) {
    // the wheel scrolls the dialog's middle, not the page
    const pageBefore = await page.evaluate(() => window.scrollY);
    const r = (await scroll.boundingBox())!;
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await page.mouse.wheel(0, 2000);
    await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(pageBefore);
    // at the bottom the last piece of content is fully visible, and the action is still in view
    await expect
      .poll(() =>
        scroll.evaluate(
          (el) => Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) <= 2,
        ),
      )
      .toBe(true);
    const last = scroll.locator("> *").last();
    const lb = (await last.boundingBox())!;
    const sb = (await scroll.boundingBox())!;
    expect(lb.y + lb.height).toBeLessThanOrEqual(sb.y + sb.height + 8);
    await expect(action).toBeInViewport({ ratio: 0.9 });
    // and back to the top: the title is still there
    await page.mouse.wheel(0, -4000);
    await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBe(0);
  }
  return overflow;
}

for (const vp of [
  { name: "short desktop", width: 1280, height: 420 },
  { name: "phone", width: 390, height: 600 },
  { name: "tiny phone, landscape", width: 640, height: 320 },
]) {
  test.describe(vp.name, () => {
    test.use({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.width < 700,
      hasTouch: vp.width < 700,
    });

    test("the edge studio scrolls in the middle, with its actions in view", async ({
      page,
    }) => {
      await signUp(page);
      await toEdgeStudio(page);
      const overflow = await expectWellBehaved(page, /Save to book/);
      expect(
        overflow,
        "this content is meant to be taller than the screen",
      ).toBeGreaterThan(20);
    });

    test("the sticker maker's drawing step", async ({ page }) => {
      await signUp(page);
      await page
        .locator('input[type="file"]')
        .first()
        .setInputFiles({
          name: "p.png",
          mimeType: "image/png",
          buffer: patternPng(480, 360, () => [90, 140, 200]),
        });
      await expect(page.getByRole("dialog", { name: "Draw around it" })).toBeVisible();
      await expectWellBehaved(page, /Cut it out/);
    });

    test("a small dialog (How it works)", async ({ page }) => {
      await signUp(page);
      await page.getByRole("button", { name: "How it works" }).click();
      await expectWellBehaved(page, /Got it|Close|OK/i);
    });
  });
}

test("the account's delete dialog on a short screen", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 380 });
  await signUp(page);
  await page.goto("/account");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expectWellBehaved(page, /Delete everything/);
});
