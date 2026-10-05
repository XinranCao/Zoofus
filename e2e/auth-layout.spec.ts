import { expect, test } from "@playwright/test";

// The log in and sign up forms are the first thing on the page at every width, in both languages:
// the whole form (down to its main button) is on screen without scrolling.
const sizes = [
  { width: 375, height: 667 },
  { width: 768, height: 1024 },
  { width: 1024, height: 800 },
  { width: 1440, height: 900 },
];

for (const size of sizes)
  for (const lang of ["EN", "中文"])
    test(`forms are fully visible at ${size.width}x${size.height} in ${lang}`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      for (const path of ["/login", "/signup"]) {
        await page.goto(path);
        if (lang === "中文") await page.getByRole("button", { name: "中文" }).click();
        const form = page.locator("main form").first();
        await expect(form).toBeVisible();
        const submit = form.locator('button[type="submit"]').first();
        const box = await submit.boundingBox();
        expect(box, `${path} submit button`).toBeTruthy();
        expect(
          box!.y + box!.height,
          `${path} ${size.width}px ${lang}`,
        ).toBeLessThanOrEqual(size.height);
        const email = await form.locator("input").first().boundingBox();
        expect(email!.y).toBeGreaterThanOrEqual(0);
        // no sideways scroll either (once the fonts are in and the page has settled)
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(300);
        const wide = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        );
        expect(wide).toBe(false);
      }
    });
