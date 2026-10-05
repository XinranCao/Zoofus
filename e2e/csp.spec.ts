import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// The hosting config (firebase.json) sends a Content-Security-Policy-Report-Only header; the
// emulated dev server sends the same one (vite.config.ts). This fails on any violation across the
// main screens, so a change that needs a new origin shows up here before it reaches production.
const hosting = JSON.parse(readFileSync("firebase.json", "utf8")).hosting;
const csp: string = hosting.headers
  .flatMap((h: { headers: { key: string; value: string }[] }) => h.headers)
  .find((h: { key: string }) => h.key === "Content-Security-Policy-Report-Only").value;

test("hosting headers: hashed assets are cached for a year, CSP is report-only", () => {
  const assets = hosting.headers.find(
    (h: { source: string }) => h.source === "/assets/**",
  );
  expect(assets.headers[0].value).toContain("immutable");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
});

test("the main screens raise no CSP violations", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      (window as unknown as { __csp: string[] }).__csp.push(
        `${e.violatedDirective} ${e.blockedURI} ${e.sourceFile ?? ""}`,
      );
    });
  });
  const seen = new Set<string>();
  const collect = async () => {
    const found: string[] = await page.evaluate(
      () => (window as unknown as { __csp: string[] }).__csp ?? [],
    );
    for (const v of found) seen.add(v);
  };
  // Judged by what was blocked, not by who asked: the dev server's refresh script is inline, zod
  // probes `eval` (and falls back), and the emulators and the dev socket live on localhost.
  const ignorable = (v: string) => {
    const blocked = v.split(" ")[1] ?? "";
    return (
      blocked === "inline" ||
      blocked === "eval" ||
      /^(https?|wss?):\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(blocked)
    );
  };

  await page.goto("/signup");
  await page
    .getByLabel("Email")
    .fill(`csp-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Nickname · 昵称").fill("Csp");
  await page.getByRole("button", { name: "Start cutting" }).click();
  await expect(page).toHaveTitle("Zoofus · Make a sticker");
  await collect();
  for (const path of [
    "/stickers",
    "/tapes",
    "/journals",
    "/friends",
    "/together",
    "/account",
  ]) {
    await page.goto(path);
    await page.waitForTimeout(1500);
    await collect();
  }
  expect([...seen].filter((v) => !ignorable(v))).toEqual([]);
});
