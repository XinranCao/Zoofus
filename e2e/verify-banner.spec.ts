import { expect, test } from "@playwright/test";
import { signUp } from "./support/flows";

test.use({ viewport: { width: 375, height: 667 } });

test("the verify-email note says once that it is optional, comes after the page when tabbing, and shrinks to an icon once hidden", async ({
  page,
}) => {
  await signUp(page, "Vera");
  const note = page.getByRole("status").filter({ hasText: "Confirm your email" });
  await expect(note).toBeVisible();
  const box = await note.boundingBox();
  expect(box!.height).toBeLessThanOrEqual(96);
  await expect(note).toContainText(
    "Optional for now. Confirming lets you reset your password.",
  );
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

  // the whole text shows (no ellipsis), and the page does not scroll sideways
  const cut = await note
    .locator(".zf-verify__text")
    .evaluate((e) => e.scrollWidth > e.clientWidth);
  expect(cut).toBe(false);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
  ).toBe(false);

  // after Resend, "Sent" is plain text: not a button, not a Tab stop
  await note.getByRole("button", { name: "Resend" }).click();
  await expect(note.getByText("Sent", { exact: true })).toBeVisible();
  await expect(note.getByRole("button", { name: "Sent" })).toHaveCount(0);
  expect(
    await note.evaluate(
      (n) =>
        [...n.querySelectorAll<HTMLElement>("*")].filter(
          (e) => e.tabIndex >= 0 && e.textContent === "Sent",
        ).length,
    ),
  ).toBe(0);

  await note.getByRole("button", { name: "Hide this note" }).click();
  await expect(note).toBeHidden();
  // it shrinks to a small icon that stays put on the next page, and opens the note again
  const icon = page.getByRole("button", { name: "Confirm your email" });
  await expect(icon).toBeVisible();
  await page.goto("/friends");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(note).toBeHidden();
  await expect(icon).toBeVisible();
  await icon.click();
  await expect(note).toBeVisible();
  // opened again, it is the short form (the sentence is only for the first view)
  await expect(note).not.toContainText("Optional for now");
  await expect(note.getByRole("button", { name: "Hide this note" })).toBeVisible();
});

test("after a few page views the note shrinks by itself; no overflow at 640x360", async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 360 });
  await signUp(page, "Vera");
  await expect(page.locator(".zf-verify")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
  ).toBe(false);
  await page.evaluate(() => localStorage.setItem("zf-verify-views", "5"));
  await page.goto("/friends");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Confirm your email" }),
  ).toBeHidden();
  await expect(page.getByRole("button", { name: "Confirm your email" })).toBeVisible();
});

test("the note's text is not cut off in Chinese either", async ({ page }) => {
  await signUp(page, "Vera");
  await page.evaluate(() => {
    localStorage.setItem("zoofus.lang", "zh-CN");
    localStorage.setItem("zf-verify-views", "0");
  });
  await page.reload();
  const note = page.locator(".zf-verify");
  await expect(note).toBeVisible();
  expect(
    await note.locator(".zf-verify__text").evaluate((e) => e.scrollWidth > e.clientWidth),
  ).toBe(false);
});

test("on a fresh page the first Tab reaches the skip link", async ({ page }) => {
  // signed out: /stickers redirects to /login, which must not move the focus
  await page.goto("/stickers");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForTimeout(1500);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  // signed in
  await signUp(page, "Tab");
  await page.goto("/stickers");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await page.waitForTimeout(800);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
});
