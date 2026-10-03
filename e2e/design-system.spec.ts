import { expect, test, type Page } from "@playwright/test";
import { copyFileSync, mkdirSync } from "node:fs";
import { inspect, type Problem } from "./support/ds-checks";
import { solidPng } from "./png";

// Verification of the design system on the real app: screenshots at 390 × 844 and 1280 × 800,
// plus the automated rules. Screenshots land in design-system/verification/.
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
] as const;
const OUT = "design-system/verification";

const photo = {
  name: "photo.png",
  mimeType: "image/png",
  buffer: solidPng(480, 360, [110, 150, 190]),
};

async function acceptFiles(
  page: Page,
  file: typeof photo | { name: string; mimeType: string; buffer: Buffer },
) {
  await page.locator('input[type="file"]').first().setInputFiles(file);
}

for (const vp of VIEWPORTS) {
  test(`every screen at ${vp.name} (${vp.width}px) follows the design system`, async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    mkdirSync(`${OUT}/${vp.name}`, { recursive: true });
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.name === "mobile",
      hasTouch: vp.name === "mobile",
    });
    const page = await context.newPage();
    const problems: Problem[] = [];
    const shot = async (screen: string) =>
      problems.push(
        ...(await inspect(
          page,
          `${vp.name}/${screen}`,
          `${OUT}/${vp.name}/${screen}.png`,
        )),
      );
    const email = `ds-${vp.name}-${Date.now()}@example.com`;

    // --- auth ---
    await page.goto("/login");
    await shot("01-login");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("wrongpass1");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(
      page.getByText("Email or password is wrong. Try again or reset your password."),
    ).toBeVisible();
    await shot("02-login-error");
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await expect(page.getByRole("dialog", { name: "Reset your password" })).toBeVisible();
    await shot("03-reset-dialog");
    await page.keyboard.press("Escape");

    await page.goto("/signup");
    await shot("04-signup-step1");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
    await shot("05-signup-field-error");
    await page.getByLabel("Password").fill("secret123");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Sign up · step 2 of 2")).toBeVisible();
    await shot("06-signup-step2");
    await page.getByLabel("Nickname · 昵称").fill("Mei");
    await page.getByRole("button", { name: "Start cutting" }).click();
    await expect(page.getByRole("heading", { name: "Cut something out" })).toBeVisible();

    // --- home (empty), menu ---
    await shot("07-home-empty");
    if (vp.name === "mobile") await page.getByRole("button", { name: "Menu" }).click();
    else await page.getByRole("button", { name: /Account menu for Mei/ }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await shot("08-menu-open");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "How it works" }).click();
    await shot("09-how-it-works");
    await page.keyboard.press("Escape");

    // --- sticker book (empty) → maker states ---
    await page.goto("/stickers");
    await expect(page.getByText("Your book is empty")).toBeVisible();
    await shot("10-book-empty");
    await page.getByRole("button", { name: "Make your first sticker" }).click();
    await expect(page.getByRole("dialog", { name: "Make a sticker" })).toBeVisible();
    await shot("11-maker-empty");
    await acceptFiles(page, {
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an image"),
    });
    await expect(page.getByText("We couldn’t open that file")).toBeVisible();
    await shot("12-maker-error");
    await acceptFiles(page, photo);
    const maker = page.getByRole("dialog", { name: "Draw around it" });
    await expect(maker).toBeVisible();
    await maker.getByRole("radio", { name: /Rectangle/ }).click();
    await maker.getByRole("button", { name: "Add shape" }).click();
    await shot("13-maker-lasso");
    await maker.getByRole("radio", { name: /Deselect/ }).click();
    await shot("14-maker-deselect-mode");
    await maker.getByRole("radio", { name: /Select$/ }).click();
    await maker.getByRole("button", { name: "Cut it out" }).click();
    await expect(page.getByRole("dialog", { name: "Your sticker" })).toBeVisible();
    await shot("15-maker-edge-torn");
    await page.getByRole("radio", { name: "Wobbly" }).click();
    await page.getByRole("radio", { name: "Dots" }).click();
    await shot("16-maker-edge-pattern");
    await page.getByRole("button", { name: "Save to book" }).click();
    await expect(page.getByText("Saved to your book.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).first().click();

    // --- book (grid), detail, edit edge ---
    await page.goto("/stickers");
    await expect(page.getByRole("button", { name: /^Open Cut / })).toBeVisible();
    await shot("17-book-grid");
    await page.getByRole("button", { name: /^Open Cut / }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await shot("18-sticker-detail");
    await page.getByRole("button", { name: "Edit edge" }).click();
    await expect(page.getByRole("dialog", { name: "Edit the edge" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Sticker preview" })).toBeVisible();
    await shot("19-edit-edge");
    await page.getByRole("button", { name: "Cancel" }).click();

    // --- tape, account, delete, 404 ---
    await page.goto("/tape");
    await expect(page.getByRole("heading", { name: "Tape studio" })).toBeVisible();
    await shot("20-tape-studio");
    await page.goto("/account");
    await shot("21-account");
    await page.getByRole("button", { name: "Delete my account" }).click();
    await shot("22-account-delete-dialog");
    await page.keyboard.press("Escape");
    await page.goto("/nothing-here");
    await shot("23-not-found");

    await context.close();
    expect(
      problems,
      problems.map((p) => `${p.screen}: ${p.rule} → ${p.detail}`).join("\n"),
    ).toEqual([]);
  });
}

test("copy the dev gallery screenshot", async ({ page }) => {
  mkdirSync(`${OUT}/desktop`, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/dev/design-system");
  await page.waitForTimeout(600);
  await page.screenshot({
    path: `${OUT}/desktop/00-dev-design-system.png`,
    fullPage: true,
  });
  void copyFileSync;
});
