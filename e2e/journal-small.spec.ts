import { expect, test, type Page } from "@playwright/test";
import { signUp } from "./support/flows";

async function openJournal(page: Page) {
  await page.goto("/journals?make=1");
  await page
    .getByRole("dialog", { name: "New journal" })
    .getByRole("button", { name: "Start" })
    .click();
  await expect(page).toHaveURL(/\/journals\/[\w-]+$/);
  await expect(page.locator(".zf-jstudio__page canvas").first()).toBeVisible();
}

// UX-047: on short and narrow screens the controls are single rows and the page comes into view
for (const [width, height] of [
  [375, 667],
  [640, 360],
  [768, 1024],
  [1280, 720],
] as const) {
  test(`the journal page is in the first screen at ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await signUp(page, "Small");
    await openJournal(page);
    // the status, Save and Download PNG are fully inside the screen, no swiping needed
    for (const target of [
      page.getByRole("status").filter({ hasText: /changes saved|Saving|Not saved/ }),
      page.getByRole("button", { name: "Save", exact: true }),
      page.getByRole("button", { name: "Download PNG" }),
    ]) {
      const b = (await target.boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(width);
      expect(b.y + b.height).toBeLessThanOrEqual(height);
    }
    const canvas = (await page
      .locator(".zf-jstudio__page canvas")
      .first()
      .boundingBox())!;
    // part of the page is visible without scrolling (at least 40 px of it (80 px when the screen is short))
    expect(canvas.y).toBeLessThan(height - (height < 480 ? 80 : 40));
    if (width < 1100) {
      // the six tools sit in one row
      const ys = await page
        .locator(".zf-jstudio__tools .zf-chip")
        .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().y)));
      expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(6); // (tilted a little by hand)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBe(true);
    }
  });
}

test("the active tool is marked without colour: pressed and underlined", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await signUp(page, "Tool");
  await openJournal(page);
  const draw = page.getByRole("button", { name: "Draw", exact: true });
  const text = page.getByRole("button", { name: "Text", exact: true });
  await draw.click();
  await expect(draw).toHaveAttribute("aria-pressed", "true");
  const underline = (l: typeof draw) =>
    l.locator(".zf-face").evaluate((e) => getComputedStyle(e).textDecorationLine);
  expect(await underline(draw)).toContain("underline");
  expect(await underline(text)).not.toContain("underline");
});
