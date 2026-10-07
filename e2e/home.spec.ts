import { expect, test, type Page } from "@playwright/test";
import { makeSticker, signUp } from "./support/flows";

const noSideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

/** The brick buttons on the page itself (the top bar is not part of what the page offers). */
const bricks = (page: Page) => page.locator("#main .zf-btn.primary:visible");

for (const [width, height] of [
  [375, 812],
  [768, 1024],
  [1440, 900],
] as const) {
  test(`signed out, / says what Zoofus is at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toHaveText("Turn your photos into stickers.");
    // the demo (photo, cut, page) and the privacy and price lines are on the page
    await expect(page.getByRole("group", { name: /becomes a sticker/ })).toBeVisible();
    await expect(page.getByText(/Private by default/)).toBeVisible();
    await expect(page.getByText(/Free to use\./).first()).toBeVisible();
    // the button the page asks for comes first; the closing section repeats it once
    await expect(bricks(page)).toHaveCount(2);
    const first = (await bricks(page).first().boundingBox())!;
    expect(first.y + first.height).toBeLessThanOrEqual(height + 400);
    expect(await noSideways(page)).toBe(true);
    await bricks(page).first().click();
    await expect(page).toHaveURL(/\/signup$/);
  });
}

test("the log in page says in a line what Zoofus is, and leads back to the landing", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.getByText("New to Zoofus?")).toBeVisible();
  await page.getByRole("link", { name: "See what it does" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Turn your photos into stickers.",
  );
});

test("a new account sees its first sticker to cut, and then its own desk", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await signUp(page, "Mia");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Hi Mia. Let’s cut your first sticker.",
  );
  await expect(page.getByRole("heading", { name: "Four things to try" })).toBeVisible();
  await expect(page.getByText("Start here")).toBeVisible();
  await expect(bricks(page)).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Upload a photo" })).toBeVisible();

  await makeSticker(page);
  await page.goto("/");
  // something has been made: the returning layout, with the nickname in the greeting
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /^(Morning|Afternoon|Evening), Mia\.$|^Still up, Mia\?$/,
  );
  await expect(page.getByRole("heading", { name: "Recently cut" })).toBeVisible();
  await expect(page.getByText("Four things to try")).toHaveCount(0);
  // a person with a sticker and no journal is pointed to a page
  await expect(page.getByText("Put it on a page", { exact: true })).toBeVisible();
});

for (const [width, height] of [
  [375, 812],
  [1440, 900],
] as const) {
  test(`with a journal, Continue is in the first screen at ${width}x${height} and opens it`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await signUp(page, "Jo");
    await page.goto("/journals?make=1");
    const dlg = page.getByRole("dialog", { name: "New journal" });
    await dlg.getByLabel("Title").fill("Spring trip");
    await dlg.getByRole("button", { name: "Start" }).click();
    await expect(page).toHaveURL(/\/journals\/[\w-]+$/);
    const journalUrl = page.url();
    await page.getByRole("link", { name: "← Journals" }).click();
    await page.goto("/");
    await expect(page.getByText("Pick up where you left off")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Spring trip" })).toBeVisible();
    const go = page.getByRole("button", { name: "Continue" });
    const box = (await go.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(height);
    await expect(bricks(page)).toHaveCount(1);
    expect(await noSideways(page)).toBe(true);
    await go.click();
    await expect(page).toHaveURL(journalUrl);
  });
}

test("a friend request waits on the home page and can be accepted there", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const a = await (
    await browser.newContext({ viewport: { width: 1280, height: 800 } })
  ).newPage();
  const b = await (
    await browser.newContext({
      viewport: { width: 1280, height: 800 },
      baseURL: String(test.info().project.use.baseURL).replace("localhost", "127.0.0.1"),
    })
  ).newPage();
  await signUp(a, "Alice");
  await signUp(b, "Bobby");
  await a.goto("/friends");
  const code = (await a.locator(".zf-code").innerText()).trim();
  await b.goto("/friends");
  await b.getByLabel("Their friend code").fill(code.toLowerCase());
  await b.getByRole("button", { name: "Find" }).click();
  await b.getByRole("button", { name: "Add friend" }).click();
  await expect(b.getByText("Request sent to Alice.").first()).toBeVisible();

  await a.goto("/");
  await expect(a.getByText("Bobby wants to be friends.")).toBeVisible({
    timeout: 20_000,
  });
  await expect(a.getByText("1 thing is waiting for you")).toBeVisible();
  await a.getByRole("button", { name: "Accept" }).click();
  await expect(a.getByText("Bobby is now your friend.").first()).toBeVisible();
  await expect(a.getByText("Bobby wants to be friends.")).toHaveCount(0);
});
