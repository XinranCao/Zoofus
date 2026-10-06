import { expect, test } from "@playwright/test";
import { patternPng } from "./png";
import { dragOnPhoto } from "./support/draw";
import { signUp } from "./support/flows";

test.use({ viewport: { width: 1280, height: 800 } });

test("editing the edge of a saved sticker saves", async ({ page }) => {
  test.setTimeout(180_000); // it tries every shape and print; CI runners are slow
  page.on("console", (m) => m.type() === "error" && console.log("CONSOLE", m.text()));
  page.on("requestfailed", (r) =>
    console.log("REQFAIL", r.url().slice(0, 100), r.failure()?.errorText),
  );
  page.on(
    "response",
    (r) => r.status() >= 400 && console.log("HTTP", r.status(), r.url().slice(0, 120)),
  );
  await page.goto("/signup");
  await page.getByLabel("Email").fill(`edit-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Nickname").fill("Edit");
  await page.getByRole("button", { name: "Start cutting" }).click();
  await expect(page).toHaveTitle("Zoofus · Make a sticker");
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
  await dragOnPhoto(page);
  await maker.getByRole("button", { name: "Cut it out" }).click();
  await page.getByRole("radio", { name: "Dots" }).click();
  await page.getByRole("button", { name: "Save to Library" }).click();
  await expect(page.getByText("Saved to your Library.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).first().click();
  await page.goto("/stickers");
  await page.getByRole("button", { name: /^Open Cut / }).click();
  await page.getByRole("button", { name: "Edit edge" }).click();
  const dlg = page.getByRole("dialog", { name: "Edit the edge" });
  await expect(dlg.getByRole("img", { name: "Sticker preview" })).toBeVisible();
  for (const shape of ["Torn", "Smooth", "Wobbly"]) {
    for (const kind of [
      "Solid",
      "Stripes",
      "Dots",
      "Gingham",
      "Check",
      "Wave",
      "Pixels",
      "Doodle",
    ]) {
      await dlg.getByRole("radio", { name: shape }).click();
      await dlg.getByRole("radio", { name: kind }).click();
      await dlg.getByRole("button", { name: "Save edge" }).click();
      await expect(page.getByText("Edge saved.", { exact: true }).last()).toBeVisible({
        timeout: 10000,
      });
      await expect(dlg).toBeHidden();
      await page.getByRole("button", { name: /^Open / }).click();
      await page.getByRole("button", { name: "Edit edge" }).click();
      await expect(dlg.getByRole("img", { name: "Sticker preview" })).toBeVisible();
    }
  }
});

// PM-v1.7.2-010: S3 starts from the Library card, on a mouse and on a touch screen
test("Edit edge is on the Library card, and the card's actions show without hover on touch", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await signUp(page, "Card");
  await page.goto("/stickers?make=1");
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "p.png",
      mimeType: "image/png",
      buffer: patternPng(480, 360, (x, y) => [(x * 3) % 256, (y * 5) % 256, 150]),
    });
  const maker = page.getByRole("dialog", { name: "Draw around it" });
  await maker.getByRole("button", { name: "Use the whole photo" }).click();
  await maker.getByRole("button", { name: "Cut it out" }).click();
  const dlg = page.getByRole("dialog", { name: "Your sticker" });
  await dlg.getByRole("button", { name: "Save to Library" }).click();
  await expect(dlg.getByText("Saved to your Library.", { exact: true })).toBeVisible();
  await dlg.getByRole("button", { name: "See it in Library" }).click();
  // no hover on a touch screen: the actions are there anyway
  const edit = page.getByRole("button", { name: /^Edit edge: / });
  await expect(edit).toBeVisible();
  expect(
    await edit.evaluate((e) => getComputedStyle(e.closest(".zf-tile__actions")!).opacity),
  ).toBe("1");
  await edit.click();
  await expect(page.getByRole("dialog", { name: "Edit the edge" })).toBeVisible();
  await context.close();
});
