import { expect, test } from "@playwright/test";
import { signUp } from "./support/flows";

// The bar at the top stays where it is while the page scrolls, on a laptop and on a phone, and the
// page does not bounce at its ends (which showed the edge of the background pattern)
for (const [width, height] of [
  [1280, 800],
  [375, 667],
] as const) {
  test(`the top bar stays put while scrolling at ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await signUp(page, "Bar");
    await page.goto("/account");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    const room = await page.evaluate(
      () => document.documentElement.scrollHeight - innerHeight,
    );
    expect(room).toBeGreaterThan(200); // a page long enough to scroll
    await page.evaluate(() => window.scrollTo(0, 400));
    await expect
      .poll(() => page.evaluate(() => Math.round(scrollY)))
      .toBeGreaterThan(100);
    const bar = (await page.locator(".zf-masthead").boundingBox())!;
    expect(Math.round(bar.y)).toBe(0);
    // no rubber band at the ends
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).overscrollBehaviorY,
      ),
    ).toBe("none");
  });
}
