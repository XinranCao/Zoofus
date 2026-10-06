import { expect, test } from "@playwright/test";
import { signUp } from "./support/flows";

test("the diagnostics page tells Firestore and Storage apart and gathers a report", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await signUp(page, "Diag");
  await page.goto("/diagnostics");
  await expect(page.getByText("local emulators")).toBeVisible();
  await page.getByRole("button", { name: "Run checks" }).click();
  await expect(page.getByText(/✓\s*Firestore read/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/✓\s*Storage write/)).toBeVisible();
  await expect(page.getByText(/✓\s*Storage read/)).toBeVisible();
  await expect(page.getByText(/App Check token/)).toBeVisible();
  await page.getByRole("button", { name: "Copy report" }).click();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain("Backend: local emulators");
  expect(text).toContain("OK   Firestore read");
  expect(text).toContain("Drawing: full");
  expect(text).toContain("Graphics:");
  expect(text).toContain("Recent errors:");
});
