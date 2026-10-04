import { expect, test } from "@playwright/test";
import { makeSticker, signUp } from "./support/flows";

test.use({ viewport: { width: 1280, height: 800 } });

test("make a journal: paper, sticker, tape, text, drawing, erase, save, reopen", async ({
  page,
}) => {
  page.on(
    "console",
    (m) => m.type() === "error" && console.log("CONSOLE", m.text().slice(0, 200)),
  );
  await signUp(page, "Jo");
  await makeSticker(page);

  // new journal
  await page.goto("/journals?make=1");
  const dlg = page.getByRole("dialog", { name: "New journal" });
  await expect(dlg).toBeVisible();
  await dlg.getByLabel("Title").fill("My trip");
  await dlg.getByRole("radio", { name: "Newspaper" }).click();
  await dlg.getByRole("radio", { name: "Columns" }).click();
  await dlg.getByRole("radio", { name: "Notebook" }).click();
  await dlg.getByRole("radio", { name: "Grid" }).click();
  await dlg.getByRole("button", { name: "Start" }).click();
  await expect(page).toHaveURL(/\/journals\/[\w-]+$/);
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/tmp/j1.png" });

  // a sticker
  await page.getByRole("button", { name: "Sticker" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: /^Cut / }).first().click();
  // a tape
  await page.getByRole("button", { name: "Tape", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Pink dots" }).click();
  await page.waitForTimeout(500);
  // text
  await page.getByRole("button", { name: "Text", exact: true }).click();
  const canvas = page.locator(".zf-jstudio__page canvas").first();
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.2);
  await page.getByLabel("Text", { exact: true }).fill("Hello 你好");
  await page.waitForTimeout(600);
  // draw
  await page.getByRole("button", { name: "Draw", exact: true }).click();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.7);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.8, { steps: 10 });
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.7, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/j2.png" });

  // erase it
  await page.getByRole("button", { name: "Erase", exact: true }).click();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.7);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.9, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Journal saved.").first()).toBeVisible();
  await page.screenshot({ path: "/tmp/j3.png" });

  // back to the list and reopen
  await page.getByRole("link", { name: "← Journals" }).click();
  await expect(page.getByRole("link", { name: /Open My trip/ })).toBeVisible();
  await page.screenshot({ path: "/tmp/j4.png" });
  await page.getByRole("link", { name: /Open My trip/ }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "/tmp/j5.png" });
});
