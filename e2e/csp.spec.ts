import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { makeSticker, signUp } from "./support/flows";

// The Content-Security-Policy is judged on a production build served with the hosting headers from
// firebase.json, the policy enforcing (playwright.config.ts, project "csp"). Any violation fails
// the test, except the few listed below, each with its reason.
const hosting = JSON.parse(readFileSync("firebase.json", "utf8")).hosting;
const all: { key: string; value: string }[] = hosting.headers.flatMap(
  (h: { headers: { key: string; value: string }[] }) => h.headers,
);
const header = (key: string) => all.find((h) => h.key === key)?.value;

/** What may be blocked without failing, and why. */
const ALLOWED = [
  // (the emulators are added to the e2e server's policy in vite.config.ts, so they need no entry)
  // zod tests whether `eval` works and falls back when it does not
  /^script-src[^ ]* eval$/,
];

async function record(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      (window as unknown as { __csp: string[] }).__csp.push(
        `${e.violatedDirective} ${e.blockedURI}`,
      );
    });
  });
}
const violations = (page: Page) =>
  page.evaluate(() => (window as unknown as { __csp: string[] }).__csp ?? []);
const unexpected = (list: string[]) =>
  list.filter((v) => !ALLOWED.some((a) => a.test(v)));

test("hosting sends an enforcing policy, the security headers and a year of cache for assets", async ({
  page,
  baseURL,
}) => {
  const csp = header("Content-Security-Policy");
  expect(csp).toBeTruthy();
  expect(header("Content-Security-Policy-Report-Only")).toBeUndefined();
  for (const part of ["frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'"])
    expect(csp).toContain(part);
  expect(csp).not.toContain("'unsafe-inline' https"); // no inline scripts
  expect(csp!.match(/script-src[^;]*/)![0]).not.toContain("unsafe-inline");
  const assets = hosting.headers.find(
    (h: { source: string }) => h.source === "/assets/**",
  );
  expect(assets.headers[0].value).toContain("immutable");
  // what the server really sends is what firebase.json says
  const res = await page.request.get(baseURL!);
  const sent = res.headers();
  // (the e2e server adds the local emulators to connect-src and img-src, nothing else)
  expect(sent["content-security-policy"]!.replace(/http:\/\/localhost:\d+ ?/g, "")).toBe(
    csp,
  );
  expect(sent["x-content-type-options"]).toBe("nosniff");
  expect(sent["x-frame-options"]).toBe("DENY");
});

test("the policy catches an inline script, an unlisted frame, an outside image and an outside request", async ({
  page,
}) => {
  await record(page);
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.evaluate(async () => {
    const s = document.createElement("script");
    s.textContent = "window.__ran = 1";
    document.head.appendChild(s);
    const f = document.createElement("iframe");
    f.src = "https://evil.example/frame";
    document.body.appendChild(f);
    const i = new Image();
    i.src = "https://evil.example/pixel.png";
    await fetch("https://evil.example/beacon").catch(() => {});
  });
  await page.waitForTimeout(500);
  const found = await violations(page);
  expect(await page.evaluate(() => (window as unknown as { __ran?: number }).__ran)).toBe(
    undefined,
  ); // the inline script did not run: it is really enforced
  for (const expected of [
    /^script-src-elem inline/,
    /^frame-src[^ ]* https:\/\/evil\.example/,
    /^img-src[^ ]* https:\/\/evil\.example\/pixel/,
    /^connect-src[^ ]* https:\/\/evil\.example\/beacon/,
  ])
    expect(
      unexpected(found).some((v) => expected.test(v)),
      `${expected} in ${found.join(" | ")}`,
    ).toBe(true);
});

test("sign up, a sticker, a tape, a journal, friends, together, sign in: no violations", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await record(page);
  const { email, password } = await signUp(page, "Csp");
  await makeSticker(page);
  await page.goto("/tapes?make=1");
  await page
    .getByRole("dialog", { name: "New tape" })
    .getByLabel("Name")
    .fill("Csp tape");
  await page.getByRole("button", { name: "Add to my tapes" }).click();
  await expect(page.getByText(/^Added .* to your tapes\.$/)).toBeVisible();
  await page.goto("/journals?make=1");
  await page
    .getByRole("dialog", { name: "New journal" })
    .getByRole("button", { name: "Start" })
    .click();
  await expect(page).toHaveURL(/\/journals\/[\w-]+$/);
  await page.waitForTimeout(1000);
  const seen: string[] = [];
  for (const path of [
    "/stickers",
    "/tapes",
    "/journals",
    "/friends",
    "/together",
    "/account",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await page.waitForTimeout(1000);
    seen.push(...(await violations(page)));
  }
  // sign out and in again
  await page.getByRole("button", { name: /Account menu for/ }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).last().click();
  await expect(page).toHaveTitle("Zoofus · Make a sticker");
  seen.push(...(await violations(page)));
  expect(unexpected([...new Set(seen)])).toEqual([]);
});
