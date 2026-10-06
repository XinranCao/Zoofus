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

test("the journal says whether it is saved, and the list shows it", async ({ page }) => {
  const warnings: string[] = [];
  page.on("console", (m) => m.type() === "warning" && warnings.push(m.text()));
  await signUp(page, "Kept");
  await page.goto("/journals?make=1");
  const dlg = page.getByRole("dialog", { name: "New journal" });
  await dlg.getByLabel("Title").fill("Kept page");
  await dlg.getByRole("button", { name: "Start" }).click();
  await expect(page).toHaveURL(/\/journals\/[\w-]+$/);
  const status = page
    .getByRole("status")
    .filter({ hasText: /changes saved|Saving|Not saved/ });
  await expect(status).toHaveText("All changes saved");
  // exactly one indicator, and Save is not a red primary button
  await expect(status).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Save", exact: true })).not.toHaveClass(
    /\bprimary\b/,
  );

  // a change: the status says it is on its way
  await page.getByRole("button", { name: "Text", exact: true }).click();
  const box = (await page.locator(".zf-jstudio__page canvas").first().boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
  await page.getByLabel("Text", { exact: true }).fill("Hello");
  await expect(status).toHaveText("Not saved yet");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(status).toHaveText("All changes saved");

  // (leaving right after Save is tested on a slow connection below)
  await page.getByRole("link", { name: "← Journals" }).click();
  await expect(page.getByRole("link", { name: /Open Kept page/ })).toBeVisible();
  await page.waitForTimeout(500);
  expect(warnings.filter((w) => w.includes("Skipping journal"))).toEqual([]);
});

// PM-v1.7.2-001: a title is never lost, and the status says so truthfully
async function newJournal(page: import("@playwright/test").Page, title: string) {
  await page.goto("/journals?make=1");
  const dlg = page.getByRole("dialog", { name: "New journal" });
  await dlg.getByLabel("Title").fill(title);
  await dlg.getByRole("button", { name: "Start" }).click();
  await expect(page).toHaveURL(/\/journals\/[\w-]+$/);
}

test("a new title settles to All changes saved, by itself and by Save", async ({
  page,
}) => {
  await signUp(page, "Title");
  await newJournal(page, "First name");
  const status = page
    .getByRole("status")
    .filter({ hasText: /changes saved|Saving|Not saved/ });
  await expect(status).toHaveText("All changes saved");
  const title = page.getByLabel("Title", { exact: true });
  await title.fill("Second name");
  await expect(status).toHaveText("Not saved yet");
  await expect(status).toHaveText("All changes saved"); // no reload, no Save
  await title.fill("Third name");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Journal saved.").first()).toBeVisible();
  await expect(status).toHaveText("All changes saved"); // the toast and the line agree
});

test("a title typed and followed at once by Back, or by a reload, is kept", async ({
  page,
}) => {
  await signUp(page, "Quick");
  await newJournal(page, "Before");
  const title = page.getByLabel("Title", { exact: true });
  // Back at once
  await title.fill("After back");
  await page.getByRole("link", { name: "← Journals" }).click();
  await expect(page.getByRole("link", { name: /Open After back/ })).toBeVisible({
    timeout: 15_000,
  });
  // reload at once: the browser warns, and the new title is still there
  await page.getByRole("link", { name: /Open After back/ }).click();
  await expect(page).toHaveURL(/\/journals\/[\w-]+$/);
  const dialogs: string[] = [];
  page.on("dialog", (d) => {
    dialogs.push(d.type());
    void d.accept();
  });
  await page.getByLabel("Title", { exact: true }).fill("After reload");
  await page.reload();
  expect(dialogs).toContain("beforeunload");
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("After reload");
  const status = page
    .getByRole("status")
    .filter({ hasText: /changes saved|Saving|Not saved/ });
  await expect(status).toHaveText("All changes saved");
});

// PM-v1.7.2-002: what you place is written within seconds, not a minute
test("a placed item is saved within seconds and is there after a reload", async ({
  page,
}) => {
  await signUp(page, "Quick");
  await newJournal(page, "Seconds");
  const status = page
    .getByRole("status")
    .filter({ hasText: /changes saved|Saving|Not saved/ });
  await expect(status).toHaveText("All changes saved");
  await page.getByRole("button", { name: "Text", exact: true }).click();
  const box = (await page.locator(".zf-jstudio__page canvas").first().boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
  await page.getByLabel("Text", { exact: true }).fill("Placed words");
  await expect(status).toHaveText("Not saved yet");
  await expect(status).toHaveText("All changes saved", { timeout: 6000 });
  await page.reload();
  await expect(page.locator("#journal-items")).toContainText("Placed words");
});

// PM-v1.7.2-011: a slow connection (600 ms latency, 50 kB/s), where "leave right after" is realistic
async function slowNetwork(page: import("@playwright/test").Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 600,
    downloadThroughput: 50 * 1024,
    uploadThroughput: 50 * 1024,
  });
  return () =>
    cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });
}

async function placeText(page: import("@playwright/test").Page, words: string) {
  await page.getByRole("button", { name: "Text", exact: true }).click();
  const box = (await page.locator(".zf-jstudio__page canvas").first().boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
  await page.getByLabel("Text", { exact: true }).fill(words);
}

for (const how of ["after pressing Save", "without pressing Save"] as const) {
  test(`on a slow connection, leaving ${how} keeps the content and the title`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signUp(page, "Slow");
    await newJournal(page, "Slow page");
    const restore = await slowNetwork(page);
    await placeText(page, `Words ${how}`);
    await page.getByLabel("Title", { exact: true }).fill(`Renamed ${how}`);
    if (how === "after pressing Save")
      await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("link", { name: "← Journals" }).click();
    await expect(page).toHaveURL(/\/journals$/);
    // let the writes that were still on their way finish, then look at what was kept
    await restore();
    await page.waitForTimeout(6000);
    await page.reload();
    await page.getByRole("link", { name: new RegExp(`Open Renamed ${how}`) }).click();
    await expect(page.locator("#journal-items")).toContainText(`Words ${how}`, {
      timeout: 15_000,
    });
  });
}

// a tape on a page can be made longer, but its width is the tape's own (no slider that did nothing)
test("a tape on the page has a length control and no width control", async ({ page }) => {
  await signUp(page, "Tape");
  await newJournal(page, "Tapes");
  await page.getByRole("button", { name: "Tape", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Pink dots" }).click();
  await expect(page.getByLabel("Length")).toBeVisible();
  await expect(page.getByLabel("Width")).toHaveCount(0);
});

// A journal that was left before its page picture was made gets one by itself, so lists and
// collections show the page and not only its paper
test("a journal without a page picture is given one, and lists show it", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signUp(page, "Heal");
  await newJournal(page, "No picture yet");
  await placeText(page, "Words on the page");
  const status = page
    .getByRole("status")
    .filter({ hasText: /changes saved|Saving|Not saved/ });
  await expect(status).toHaveText("All changes saved", { timeout: 8000 });
  await page.getByRole("link", { name: "← Journals" }).click();
  const tile = page.locator(".zf-jtile").filter({ hasText: "No picture yet" });
  await expect(tile).toBeVisible();
  // ... and, within a moment, its picture (an image, not the paper swatch)
  await expect(tile.locator("img")).toBeVisible({ timeout: 40_000 });
});
