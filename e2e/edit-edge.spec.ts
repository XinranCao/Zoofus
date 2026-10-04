import { expect, test } from "@playwright/test";
import { patternPng } from "./png";
import { dragOnPhoto } from "./support/draw";

test.use({ viewport: { width: 1280, height: 800 } });

test("editing the edge of a saved sticker saves", async ({ page }) => {
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
  await page.getByLabel("Nickname · 昵称").fill("Edit");
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
  await page.getByRole("button", { name: "Save to book" }).click();
  await expect(page.getByText("Saved to your book.", { exact: true })).toBeVisible();
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
