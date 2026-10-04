import { expect, test } from "@playwright/test";
import { makeSticker, signUp } from "./support/flows";

test.use({ viewport: { width: 1280, height: 800 } });

test("two people become friends, name each other, share and keep a sticker", async ({
  browser,
}) => {
  test.setTimeout(150_000);
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  // Bobby opens the app by another address of the same machine, as a second laptop would: the
  // links to Alice's pictures name "localhost", and must still reach his browser
  const ctxB = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    baseURL: String(test.info().project.use.baseURL).replace("localhost", "127.0.0.1"),
  });
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

  // Alice waits on her Friends page: what happens next must show up without a refresh
  // Bobby asks with it
  await b.goto("/friends");
  await b.getByLabel("Their friend code").fill(code.toLowerCase());
  await b.getByRole("button", { name: "Find" }).click();
  await expect(b.getByText("Alice", { exact: true }).first()).toBeVisible();
  await b.getByRole("button", { name: "Add friend" }).click();
  await expect(b.getByText("Request sent to Alice.").first()).toBeVisible();

  // Alice sees the request arrive on her own (no refresh), in the tab count, and accepts
  await expect(a.getByRole("radio", { name: /Requests · 1/ })).toBeVisible({
    timeout: 20_000,
  });
  await a.getByRole("radio", { name: /Requests · 1/ }).click();
  await expect(a.getByText("Bobby")).toBeVisible();
  await a.getByRole("button", { name: "Accept" }).click();
  await expect(a.getByText("You and Bobby are friends now.").first()).toBeVisible();

  // Bobby, still on his page, sees Alice as a friend now, and the request he sent is gone
  await expect(b.getByRole("radio", { name: /Friends · 1/ })).toBeVisible({
    timeout: 20_000,
  });

  // Alice gives Bobby a nickname only she sees
  await a.getByRole("radio", { name: /Friends · 1/ }).click();
  await a.getByRole("button", { name: /Give Bobby a nickname/ }).click();
  await a.getByLabel("Your name for them").fill("Bob the builder");
  await a.getByRole("button", { name: "Save" }).click();
  await expect(a.getByText("Bob the builder")).toBeVisible();

  // Bobby is her friend, too
  await b.goto("/friends");
  await expect(b.getByText("Alice", { exact: true }).first()).toBeVisible();

  // Alice makes a sticker and makes it her picture; Bobby sees it
  await makeSticker(a);
  await a.goto("/account");
  await a.getByRole("button", { name: "Use one of my stickers" }).click();
  await a.getByRole("dialog").getByRole("button", { name: /^Cut / }).first().click();
  await expect(a.getByText("Your picture is updated.").first()).toBeVisible({
    timeout: 20_000,
  });
  await b.goto("/friends");
  await expect
    .poll(
      () =>
        b.evaluate(() => {
          const img = document.querySelector<HTMLImageElement>(
            ".zf-people img.zf-avatar__sticker",
          );
          return Boolean(img && img.complete && img.naturalWidth > 0);
        }),
      { timeout: 30_000 },
    )
    .toBe(true);

  // Alice shares a sticker with Bobby straight from its tile (no need to pick it first)
  const sentLeft = async () => {
    const res = await a.request.post(
      "http://127.0.0.1:8080/v1/projects/demo-zoofus/databases/(default)/documents:runQuery",
      {
        headers: { Authorization: "Bearer owner" },
        data: {
          structuredQuery: {
            from: [{ collectionId: "sent", allDescendants: true }],
            limit: 1000,
          },
        },
      },
    );
    expect(res.ok()).toBe(true);
    return ((await res.json()) as { document?: unknown }[]).filter((r) => r.document)
      .length;
  };
  const base = await sentLeft();
  await a.goto("/stickers");
  await a.locator(".zf-tile").first().hover();
  await a.getByRole("button", { name: /^Share: Cut / }).click();
  const dlg = a.getByRole("dialog", { name: /Share 1 item/ });
  await dlg.getByRole("button", { name: /Bob the builder/ }).click();
  await dlg.getByLabel("Add a note (optional)").fill("For you!");
  await dlg.getByRole("button", { name: "Send" }).click();
  await expect(a.getByText("Shared with your friend.").first()).toBeVisible({
    timeout: 15000,
  });

  // (Alice's record of what she sent, and the files made for Bobby, exist until he is done)
  expect(await sentLeft()).toBe(base + 1);

  // Bobby finds it in "Shared with you" and keeps it
  await b.goto("/friends");
  await b.getByRole("radio", { name: /Shared with you/ }).click();
  await expect(b.getByText("“For you!”")).toBeVisible({ timeout: 15000 });
  await expect
    .poll(() =>
      b
        .locator('img[src*=":9199/"]')
        .evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src)),
    )
    .toEqual(expect.arrayContaining([expect.stringContaining("http://127.0.0.1:9199/")]));
  await b.getByRole("button", { name: "Add to my stickers" }).click();
  await expect(b.getByText("Added to your stickers.").first()).toBeVisible({
    timeout: 15000,
  });
  // what is kept leaves "Shared with you" (so it cannot be kept twice)
  await expect(b.getByRole("button", { name: "Add to my stickers" })).toHaveCount(0);
  await expect(b.getByRole("radio", { name: /Shared with you · 0/ })).toBeVisible();
  await b.goto("/stickers");
  await expect(b.getByRole("button", { name: /^Open Cut / })).toBeVisible();

  // Alice's copies made for Bobby are removed once he has kept his own: her record of the share
  // goes, and so do the files in her shares folder
  await a.goto("/stickers");
  await expect.poll(sentLeft, { timeout: 20_000 }).toBe(base);
  for (const bucket of ["demo-zoofus.firebasestorage.app", "demo-zoofus.appspot.com"]) {
    const res = await a.request.get(`http://127.0.0.1:9199/v0/b/${bucket}/o`);
    if (!res.ok()) continue;
    const { items = [] } = (await res.json()) as { items?: { name: string }[] };
    expect(items.filter((o) => o.name.includes("/shares/"))).toHaveLength(0);
  }

  await ctxA.close();
  await ctxB.close();
});
