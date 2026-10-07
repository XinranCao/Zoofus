import { expect, test } from "@playwright/test";
import { signUp } from "./support/flows";

test.use({ viewport: { width: 375, height: 667 } });

/** The note counts page views per account; set that count for whoever is signed in. */
async function setViews(page: import("@playwright/test").Page, n: number) {
  await page.evaluate((count) => {
    for (const k of Object.keys(localStorage))
      if (k.startsWith("zf-verify-views")) localStorage.setItem(k, String(count));
  }, n);
}

test("the verify-email note says once that it is optional, comes after the page when tabbing, and shrinks to an icon once hidden", async ({
  page,
}) => {
  await signUp(page, "Vera");
  const note = page.getByRole("status").filter({ hasText: "Confirm your email" });
  await expect(note).toBeVisible();
  const box = await note.boundingBox();
  expect(box!.height).toBeLessThanOrEqual(96);
  await expect(note).toContainText(
    "Optional for now; it lets you reset your password later.",
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
  // it shrinks to a small chip that stays put on the next page and is itself the Resend button
  // (Resend was pressed above, so for now it says Sent)
  await expect(
    page.getByRole("button", { name: "Email not confirmed · Sent" }),
  ).toBeVisible();
  await page.goto("/friends");
  const icon = page.getByRole("button", { name: "Email not confirmed · Resend" });
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(note).toBeHidden();
  await expect(icon).toBeVisible();
  await icon.click();
  await expect(
    page.getByRole("button", { name: "Email not confirmed · Sent" }),
  ).toBeDisabled();
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
  await setViews(page, 5);
  await page.goto("/friends");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Confirm your email" }),
  ).toBeHidden();
  // collapsed: a chip with words, not a strip, and it still shows on a short screen
  const chip = page.getByRole("button", { name: "Email not confirmed · Resend" });
  await expect(chip).toBeVisible();
  expect((await chip.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect((await page.locator(".zf-verify--small").boundingBox())!.width).toBeLessThan(
    300,
  );
});

test("the note's text is not cut off in Chinese either", async ({ page }) => {
  await signUp(page, "Vera");
  await page.evaluate(() => {
    localStorage.setItem("zoofus.lang", "zh-CN");
  });
  await setViews(page, 0);
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

// PM-v1.7.2-006: what one account did to the note does not carry over to the next on this computer
test("a second account in the same browser sees the explaining sentence once", async ({
  page,
}) => {
  await signUp(page, "First");
  await expect(page.locator(".zf-verify")).toContainText("Optional for now");
  await page
    .getByRole("button", { name: /Menu|Account menu for/ })
    .first()
    .click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await signUp(page, "Second");
  await expect(page.locator(".zf-verify")).toContainText("Optional for now");
});
