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
  await dlg.getByRole("button", { name: /^Pattern/ }).click();
  await page.getByRole("menuitemradio", { name: "Aged" }).click();
  await dlg.getByRole("radio", { name: "Notebook" }).click();
  await dlg.getByRole("button", { name: /^Pattern/ }).click();
  await page.getByRole("menuitemradio", { name: "Grid" }).click();
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

/** Is anything painted at this page position on the objects layer of the studio canvas? */
async function inked(page: import("@playwright/test").Page, x: number, y: number) {
  return page.evaluate(
    ([px, py]) => {
      const layers = document.querySelectorAll<HTMLCanvasElement>(
        ".zf-jstudio__page canvas",
      );
      const c = layers[1];
      if (!c) return false;
      const r = c.getBoundingClientRect();
      const g = c.getContext("2d")!;
      const sx = c.width / r.width;
      const d = g.getImageData(
        Math.round((px - r.left) * sx),
        Math.round((py - r.top) * sx),
        1,
        1,
      ).data;
      return d[3]! > 40;
    },
    [x, y] as const,
  );
}

test("the eraser rubs out only where it went; stickers move, stretch and pass clicks through", async ({
  page,
}) => {
  await signUp(page, "Jo");
  await makeSticker(page);
  // the Make menu opens the dialog over this page: it does not navigate
  await page.goto("/stickers");
  await page.getByRole("button", { name: /^Make/ }).click();
  await page.getByRole("menuitem", { name: "Journal", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "New journal" })).toBeVisible();
  await expect(page).toHaveURL(/\/stickers$/);
  await page.getByRole("dialog").getByRole("button", { name: "Start" }).click();
  await expect(page).toHaveURL(/\/journals\/[\w-]+$/);
  await page.waitForTimeout(800);
  const canvas = page.locator(".zf-jstudio__page canvas").first();
  const box = (await canvas.boundingBox())!;
  const at = (fx: number, fy: number) =>
    [box.x + box.width * fx, box.y + box.height * fy] as const;

  // one long line, then rub out a short stretch in the middle
  await page.getByRole("button", { name: "Draw", exact: true }).click();
  const [lx, ly] = at(0.15, 0.85);
  await page.mouse.move(lx, ly);
  await page.mouse.down();
  await page.mouse.move(...at(0.85, 0.85), { steps: 30 });
  await page.mouse.up();
  expect(await inked(page, ...at(0.3, 0.85))).toBe(true);
  expect(await inked(page, ...at(0.5, 0.85))).toBe(true);
  expect(await inked(page, ...at(0.7, 0.85))).toBe(true);
  await page.getByRole("button", { name: "Erase", exact: true }).click();
  await page.mouse.move(...at(0.5, 0.85 - 0.02));
  await page.mouse.down();
  await page.mouse.move(...at(0.5, 0.85 + 0.02), { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  expect(await inked(page, ...at(0.5, 0.85))).toBe(false); // rubbed out here
  expect(await inked(page, ...at(0.3, 0.85))).toBe(true); // the rest of the line stays
  expect(await inked(page, ...at(0.7, 0.85))).toBe(true);

  // a sticker: add, drag it, stretch it by a side handle
  await page.getByRole("button", { name: "Sticker" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: /^Cut / }).first().click();
  await page.waitForTimeout(500);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  expect(await inked(page, cx, cy)).toBe(true);
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx - 100, cy - 200, { steps: 8 });
  await page.mouse.up();
  expect(await inked(page, cx, cy)).toBe(false);
  expect(await inked(page, cx - 100, cy - 200)).toBe(true);
  // switching tools leaves it where it was put
  await page.getByRole("button", { name: "Text", exact: true }).click();
  expect(await inked(page, cx - 100, cy - 200)).toBe(true);
  await page.getByRole("button", { name: "Move", exact: true }).click();
  await page.mouse.click(cx - 100, cy - 200);
  const k = box.width / 840;
  const right = cx - 100 + (252 * k) / 2;
  expect(await inked(page, right + 60, cy - 200)).toBe(false);
  await page.mouse.move(right, cy - 200); // the right-middle handle
  await page.mouse.down();
  await page.mouse.move(right + 90, cy - 200, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  expect(await inked(page, right + 60, cy - 200)).toBe(true); // wider now, not taller
  expect(await inked(page, cx - 100, cy - 200 - 189 * k)).toBe(false);
});
