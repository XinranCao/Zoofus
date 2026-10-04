import { expect, test } from "@playwright/test";
import { makeSticker, signUp } from "./support/flows";

test.use({ viewport: { width: 1280, height: 800 } });

test("two people become friends, name each other, share and keep a sticker", async ({
  browser,
}) => {
  test.setTimeout(150_000);
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

  // Alice's friend code
  await a.goto("/friends");
  const code = (await a.locator(".zf-code").innerText()).trim();
  await expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);

  // Bobby asks with it
  await b.goto("/friends");
  await b.getByLabel("Their friend code").fill(code.toLowerCase());
  await b.getByRole("button", { name: "Find" }).click();
  await expect(b.getByText("Alice", { exact: true }).first()).toBeVisible();
  await b.getByRole("button", { name: "Add friend" }).click();
  await expect(b.getByText("Request sent to Alice.").first()).toBeVisible();

  // Alice sees the request (in the tab count) and accepts
  await a.goto("/friends");
  await a.getByRole("radio", { name: /Requests · 1/ }).click();
  await expect(a.getByText("Bobby")).toBeVisible();
  await a.getByRole("button", { name: "Accept" }).click();
  await expect(a.getByText("You and Bobby are friends now.").first()).toBeVisible();

  // Alice gives Bobby a nickname only she sees
  await a.getByRole("radio", { name: /Friends · 1/ }).click();
  await a.getByRole("button", { name: /Give Bobby a nickname/ }).click();
  await a.getByLabel("Your name for them").fill("Bob the builder");
  await a.getByRole("button", { name: "Save" }).click();
  await expect(a.getByText("Bob the builder")).toBeVisible();

  // Bobby is her friend, too
  await b.goto("/friends");
  await expect(b.getByText("Alice", { exact: true }).first()).toBeVisible();

  // Alice makes a sticker and shares it with Bobby
  await makeSticker(a);
  await a.goto("/stickers");
  await a.getByRole("button", { name: "Select" }).click();
  await a.getByRole("button", { name: /^Cut / }).first().click();
  await a.getByRole("button", { name: "Share" }).click();
  const dlg = a.getByRole("dialog", { name: /Share 1 item/ });
  await dlg.getByRole("button", { name: /Bob the builder/ }).click();
  await dlg.getByLabel("Add a note (optional)").fill("For you!");
  await dlg.getByRole("button", { name: "Send" }).click();
  await expect(a.getByText("Shared with your friend.").first()).toBeVisible({
    timeout: 15000,
  });

  // Bobby finds it in "Shared with you" and keeps it
  await b.goto("/friends");
  await b.getByRole("radio", { name: /Shared with you/ }).click();
  await expect(b.getByText("“For you!”")).toBeVisible({ timeout: 15000 });
  await b.getByRole("button", { name: "Add to my stickers" }).click();
  await expect(b.getByText("Added to your stickers.").first()).toBeVisible({
    timeout: 15000,
  });
  await b.goto("/stickers");
  await expect(b.getByRole("button", { name: /^Open Cut / })).toBeVisible();

  await ctxA.close();
  await ctxB.close();
});
