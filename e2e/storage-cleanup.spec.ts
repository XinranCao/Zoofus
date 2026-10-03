import { dragOnPhoto } from "./support/draw";
import { expect, test } from "@playwright/test";
import { solidPng } from "./png";

// Deleting a sticker must remove every stored object (the rendered image and the edge-less
// source), so nothing is orphaned in Cloud Storage. Counts objects through the emulator's REST API.
const BUCKETS = [
  "demo-zoofus.appspot.com",
  "zoofus-48264.firebasestorage.app",
  "zoofus-48264.appspot.com",
];

async function stickerObjects(): Promise<string[]> {
  const names: string[] = [];
  for (const bucket of BUCKETS) {
    const res = await fetch(
      `http://127.0.0.1:9199/v0/b/${bucket}/o?maxResults=1000`,
      // the emulator's admin token: listing is denied to normal users by storage.rules
      { headers: { Authorization: "Bearer owner" } },
    ).catch(() => null);
    if (!res?.ok) continue;
    const body = (await res.json()) as { items?: { name: string }[] };
    for (const item of body.items ?? [])
      if (item.name.includes("/stickers/")) names.push(item.name);
  }
  return names;
}

test("deleting a sticker removes its image and source from Storage", async ({ page }) => {
  const before = await stickerObjects();

  await page.goto("/signup");
  await page.getByLabel("Email").fill(`e2e-orphans-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Nickname · 昵称").fill("Orphans");
  await page.getByRole("button", { name: "Start cutting" }).click();
  await expect(page).toHaveTitle("Zoofus · Make a sticker");
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: solidPng(400, 300, [90, 140, 200]),
    });
  const maker = page.getByRole("dialog", { name: "Draw around it" });
  await maker.getByRole("radio", { name: /Rectangle/ }).click();
  await dragOnPhoto(page);
  await maker.getByRole("button", { name: "Cut it out" }).click();
  await page.getByRole("button", { name: "Save to book" }).click();
  await expect(page.getByText("Saved to your book.", { exact: true })).toBeVisible();

  await expect.poll(async () => (await stickerObjects()).length - before.length).toBe(2);

  await page.goto("/stickers");
  await page.getByRole("button", { name: /^Delete: Cut / }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("No. 00 · Sticker book")).toBeVisible();

  // the delete is deferred a few seconds (for Undo), then both files must be gone
  await expect
    .poll(async () => (await stickerObjects()).length, { timeout: 20_000 })
    .toBe(before.length);

  // clean up the account so the emulator stays tidy
  await page.goto("/account");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: "Delete everything" }).click();
});
