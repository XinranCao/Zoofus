import { expect, test, type Page } from "@playwright/test";
import { signUp } from "./support/flows";

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

// A journal shared before its page picture was made used to arrive as bare paper until its owner
// edited and saved it again.
test("a shared journal shows what is on its page, even before it has a page picture", async ({
  browser,
}) => {
  test.setTimeout(150_000);
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
  await befriend(a, b);

  // Alice makes a journal with some words on it and shares it at once (no picture of it exists)
  await a.goto("/journals?make=1");
  const dlg = a.getByRole("dialog", { name: "New journal" });
  await dlg.getByLabel("Title").fill("Fresh page");
  await dlg.getByRole("button", { name: "Start" }).click();
  await expect(a).toHaveURL(/\/journals\/[\w-]+$/);
  await a.getByRole("button", { name: "Text", exact: true }).click();
  const box = (await a.locator(".zf-jstudio__page canvas").first().boundingBox())!;
  await a.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
  await a.getByLabel("Text", { exact: true }).fill("Hello Bobby");
  const status = a
    .getByRole("status")
    .filter({ hasText: /changes saved|Saving|Not saved/ });
  await expect(status).toHaveText("All changes saved", { timeout: 8000 });
  await a.getByRole("link", { name: "← Journals" }).click();
  await a.locator(".zf-tile").first().hover();
  await a.getByRole("button", { name: /^Share: Fresh page/ }).click();
  const share = a.getByRole("dialog", { name: /Share 1 item/ });
  await share.getByRole("button", { name: /Bobby/ }).click();
  await share.getByRole("button", { name: "Send" }).click();
  await expect(a.getByText("Sent to Bobby.").first()).toBeVisible({ timeout: 20_000 });

  // Bobby sees the page itself (a drawn page, not an empty paper swatch)
  await b.goto("/friends");
  await b.getByRole("radio", { name: /Shared with you/ }).click();
  const card = b.locator(".zf-face").filter({ hasText: "Fresh page" }).last();
  await expect(card).toBeVisible({ timeout: 20_000 });
  // either the picture its owner made, or the page drawn from what was sent (never bare paper)
  const picture = card.locator('img[src*=":9199/"], .zf-payload-page canvas');
  await expect(picture.first()).toBeVisible({ timeout: 15_000 });
});
