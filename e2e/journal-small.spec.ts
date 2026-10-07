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
    // on a phone Download is behind "More"
    if (width < 500) await page.getByRole("button", { name: "More" }).click();
    // the status and Download image are fully inside the screen, no swiping needed
    for (const target of [
      page.getByRole("status").filter({ hasText: /^(Saved|Saving…|Not saved yet)$/ }),
      page.getByRole("button", { name: "Download image" }),
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

// PM-v1.7.6-010: on a phone the page comes first
for (const [width, height] of [
  [375, 667],
  [390, 844],
] as const) {
  test(`at ${width}x${height} at least half the screen is page, and every tool is in reach`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await signUp(page, "Phone");
    await openJournal(page);
    await page.waitForTimeout(500);
    const canvas = (await page
      .locator(".zf-jstudio__page canvas")
      .first()
      .boundingBox())!;
    const bar = (await page.locator(".zf-jstudio__tools").boundingBox())!;
    // the part of the page above the tool bar, as a share of the screen
    const shown = Math.min(canvas.y + canvas.height, bar.y) - Math.max(canvas.y, 0);
    expect(shown / height).toBeGreaterThanOrEqual(0.5);
    // all six tools are on the screen at once: nothing to swipe
    const tools = await page.locator(".zf-jstudio__tools .zf-chip").evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        return [r.left, r.right, r.top, r.bottom];
      }),
    );
    expect(tools).toHaveLength(6);
    for (const [l, r, t, b] of tools) {
      expect(l).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(width);
      expect(t).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(height);
    }
    // the confirm-email note stays out of the editor
    await expect(page.locator(".zf-verify")).toBeHidden();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
  });
}

for (const [width, height] of [
  [375, 667],
  [768, 1024],
] as const) {
  test(`at ${width}x${height} the text field is in view while typing and the page stays put`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await signUp(page, "Typist");
    await openJournal(page);
    await page.getByRole("button", { name: "Text", exact: true }).click();
    const canvas = page.locator(".zf-jstudio__page canvas").first();
    const box = (await canvas.boundingBox())!;
    const before = await page.evaluate(() => scrollY);
    await page.mouse.click(
      box.x + box.width * 0.3,
      box.y + Math.min(box.height * 0.2, 120),
    );
    const field = page.getByLabel("Text", { exact: true });
    await field.fill("Hello");
    const f = (await field.boundingBox())!;
    expect(f.y).toBeGreaterThanOrEqual(0);
    expect(f.y + f.height).toBeLessThanOrEqual(height);
    expect(await page.evaluate(() => scrollY)).toBe(before);
    // the page did not scroll away: the words are still on it, in view
    const after = (await canvas.boundingBox())!;
    expect(after.y).toBeCloseTo(box.y, 0);
  });
}

test("a picked tape lands on top of everything, selected, with a note", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signUp(page, "Taper");
  await openJournal(page);
  await page.getByRole("button", { name: "Tape", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Pink dots" }).click();
  await expect(page.getByText("Tape added").first()).toBeVisible();
  // selected: its length control shows
  await expect(page.getByRole("slider", { name: /Length/ })).toBeVisible();
  const last = page.locator("#journal-items li").last();
  await expect(last).toContainText(/tape/i);
});
