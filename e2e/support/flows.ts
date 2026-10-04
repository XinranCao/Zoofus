import { expect, type Page } from "@playwright/test";
import { patternPng } from "../png";
import { dragOnPhoto } from "./draw";

/** Sign up with a fresh account and land on Home. */
export async function signUp(page: Page, nickname = "Tester", tag = "e2e") {
  const email = `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Nickname · 昵称").fill(nickname);
  await page.getByRole("button", { name: "Start cutting" }).click();
  await expect(page).toHaveTitle("Zoofus · Make a sticker");
  return { email, password: "secret123" };
}

/** Cut a sticker from a generated photo and save it to the book. Returns to Home. */
export async function makeSticker(
  page: Page,
  tint: [number, number, number] = [200, 90, 80],
) {
  await page.goto("/stickers?make=1");
  const picker = page.locator('input[type="file"]').first();
  await expect(picker).toBeAttached();
  await picker.setInputFiles({
    name: "p.png",
    mimeType: "image/png",
    buffer: patternPng(480, 360, (x, y) => [
      (tint[0] + x) % 256,
      (tint[1] + y) % 256,
      tint[2],
    ]),
  });
  const maker = page.getByRole("dialog", { name: "Draw around it" });
  await expect(maker).toBeVisible();
  await maker.getByRole("radio", { name: /Rectangle/ }).click();
  await dragOnPhoto(page);
  await maker.getByRole("button", { name: "Cut it out" }).click();
  await page.getByRole("button", { name: "Save to book" }).click();
  await expect(
    page.getByText("Saved to your book.", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close" }).first().click();
}
