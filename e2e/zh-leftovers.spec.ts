import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 800 } });

// UX-053/060: no half-sentence heading, a title for each sign-up step, no raw colour names, and
// no "Sticker" announced for decoration
test("Chinese: sign-up steps are titled, colours have names, decoration is silent", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("zoofus.lang", "zh-CN"));
  await page.goto("/signup");
  await expect(page).toHaveTitle("Zoofus · 注册");
  await page.getByLabel("邮箱").fill(`zh-${Date.now()}@example.com`);
  await page.getByLabel("密码").fill("secret123");
  await page.getByRole("button", { name: "继续" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("怎么称呼你？");
  await expect(page).toHaveTitle("Zoofus · 注册:你的昵称");
  await page.getByLabel("昵称").fill("小明");
  await page.getByRole("button", { name: /开始/ }).click();
  await expect(page).toHaveTitle(/^Zoofus · (?!注册)/);

  // decorative sticker art is not announced on the library pages
  for (const path of ["/stickers", "/tapes", "/journals"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(page.getByRole("img", { name: "Sticker", exact: true })).toHaveCount(0);
  }

  // colour names are translated, in the journal's pen colours too (not "loden-900")
  await page.goto("/journals?make=1");
  await page.getByRole("dialog").getByRole("button", { name: /开始/ }).click();
  await page.getByRole("button", { name: "画画", exact: true }).click();
  const names = await page
    .locator(".zf-swatch")
    .evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
  expect(names.length).toBeGreaterThan(10);
  for (const n of names) expect(n).not.toMatch(/^[a-z]+-\d{2,3}$/);
});
