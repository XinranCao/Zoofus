import { expect, test } from "./support/csp-guard";

// Google sign-in against the Auth Emulator's popup, with an account that has a photo (Google gives
// every such account a googleusercontent.com picture link). The v1.7.0 picture rules refused that
// link, so the public profile (friend code, avatar) was never written and nothing said so.
test("a Google account with a photo gets a friend code and a name", async ({ page }) => {
  const email = `google-${Date.now()}@example.com`;
  await page.goto("/login");
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState("load");
  // (the emulator page wires its buttons a moment after it loads, so retry the click)
  await expect(async () => {
    await popup.getByRole("button", { name: /Add new account/i }).click();
    await expect(popup.locator("#email-input")).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  await popup.locator("#email-input").fill(email);
  await popup.locator("#display-name-input").fill("Gina Google");
  await popup
    .locator("#profile-photo-input")
    .fill("https://lh3.googleusercontent.com/a/e2e-photo=s96-c");
  await popup.locator("#sign-in").click();

  // a Google account has no profile yet: the nickname dialog asks once
  const setup = page.getByRole("dialog", { name: "What should we call you?" });
  await expect(setup).toBeVisible({ timeout: 20_000 });
  // Enter in the nickname field continues (it is a real form)
  await setup.getByLabel("Nickname").press("Enter");
  await expect(setup).toBeHidden();

  await page.goto("/friends");
  const code = page.locator(".zf-code");
  await expect(code).not.toHaveText("········", { timeout: 20_000 });
  await expect(code).toHaveText(/^[A-Z0-9]{4}[- ]?[A-Z0-9]{4}$/i);
  await expect(page.getByText("We could not load your friend code.")).toHaveCount(0);
});
