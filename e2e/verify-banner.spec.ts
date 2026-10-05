import { expect, test } from "@playwright/test";
import { signUp } from "./support/flows";

test.use({ viewport: { width: 375, height: 667 } });

test("the verify-email note is one small line, comes after the page when tabbing, and stays away once hidden", async ({
  page,
}) => {
  await signUp(page, "Vera");
  const note = page.getByRole("status").filter({ hasText: "Check your email" });
  await expect(note).toBeVisible();
  const box = await note.boundingBox();
  expect(box!.height).toBeLessThanOrEqual(48);
  // shown under the masthead, above the page...
  const main = await page.locator("#main").boundingBox();
  expect(box!.y).toBeLessThan(main!.y);
  // ... but reached after the page content when tabbing
  const order = await page.evaluate(() => {
    const els = [...document.querySelectorAll<HTMLElement>("a,button,input")].filter(
      (e) => e.tabIndex >= 0,
    );
    const main = document.getElementById("main")!;
    const banner = document.querySelector(".zf-verify")!;
    const last = els.filter((e) => main.contains(e)).pop()!;
    const first = els.find((e) => banner.contains(e))!;
    return els.indexOf(last) < els.indexOf(first);
  });
  expect(order).toBe(true);

  await note.getByRole("button", { name: "Hide this note" }).click();
  await expect(note).toBeHidden();
  await page.goto("/friends");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(note).toBeHidden();
});
