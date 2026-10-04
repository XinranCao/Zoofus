import { expect, test, type Page } from "@playwright/test";
import { makeSticker, signUp } from "./support/flows";

test.use({ viewport: { width: 1280, height: 800 } });

async function befriend(a: Page, b: Page) {
  await a.goto("/friends");
  const code = (await a.locator(".zf-code").innerText()).trim();
  await b.goto("/friends");
  await b.getByLabel("Their friend code").fill(code);
  await b.getByRole("button", { name: "Find" }).click();
  await b.getByRole("button", { name: "Add friend" }).click();
  await expect(b.getByText(/Request sent/).first()).toBeVisible();
  await a.goto("/friends");
  await a.getByRole("radio", { name: /Requests · 1/ }).click();
  await a.getByRole("button", { name: "Accept" }).click();
  await expect(a.getByText(/are friends now/).first()).toBeVisible();
}

test("two friends make a journal page together and each keeps a copy", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();
  for (const p of [a, b])
    p.on(
      "console",
      (m) => m.type() === "error" && console.log("CONSOLE", m.text().slice(0, 200)),
    );
  await signUp(a, "Alice");
  await signUp(b, "Bobby");
  await befriend(a, b);

  // Alice starts a page and invites Bobby
  await a.goto("/together?make=1");
  const dlg = a.getByRole("dialog", { name: "Start a page together" });
  await dlg.getByLabel("Title").fill("Trip page");
  await dlg.getByRole("button", { name: /Bobby/ }).click();
  await dlg.getByRole("button", { name: "Start", exact: true }).click();
  await expect(a).toHaveURL(/\/together\/.+/);
  await expect(a.getByText("Bobby")).toBeVisible({ timeout: 15000 });

  // Bobby, wherever he is, sees a red dot on Together, then the invitation itself
  await expect(b.getByRole("img", { name: /invitation waiting/ })).toBeVisible({
    timeout: 20_000,
  });
  await b.goto("/together");
  await expect(b.getByText("Trip page").first()).toBeVisible({ timeout: 15000 });
  await b.getByRole("button", { name: "Join" }).click();
  await expect(b.getByText("You joined Trip page").first()).toBeVisible();
  await b.getByRole("link", { name: /Open Trip page/ }).click();
  await expect(b).toHaveURL(/\/together\/.+/);
  await expect(b.getByText("Alice").first()).toBeVisible({ timeout: 15000 });

  // Alice brings a sticker to the shelf; Bobby can pick it
  await makeSticker(a);
  await a.goBack().catch(() => {});
  await a.goto(b.url().replace(/^.*\/together/, "/together"));
  await a.getByRole("button", { name: "Bring in" }).click();
  const bring = a.getByRole("dialog", { name: /Bring in/ });
  await bring.getByRole("button", { name: /^Cut / }).first().click();
  await bring.getByRole("button", { name: "Bring in 1" }).click();
  await expect(a.getByText(/Brought in 1 piece/).first()).toBeVisible({ timeout: 20000 });

  await b.getByRole("button", { name: "Sticker" }).first().click();
  // the sticker Alice brought is visible to Bobby (it lives in the shelf entry, not in her files)
  const brought = b.getByRole("dialog").getByRole("button", { name: /^Cut / }).first();
  await expect(brought).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(() =>
      brought
        .locator("img")
        .evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0),
    )
    .toBe(true);
  await brought.click();

  // Bobby saves a copy; it shows up in his journals
  await b.getByRole("button", { name: "Save a copy" }).click();
  await expect(b.getByText("A copy is in your journals").first()).toBeVisible({
    timeout: 20000,
  });
  await b.goto("/journals");
  await expect(b.getByRole("link", { name: /Open Trip page/ })).toBeVisible();

  await ctxA.close();
  await ctxB.close();
});
