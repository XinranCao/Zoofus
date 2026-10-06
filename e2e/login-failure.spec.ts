import { expect, test } from "@playwright/test";
import { signUp } from "./support/flows";

test("a wrong password keeps the email, clears the password and focuses it", async ({
  page,
}) => {
  const { email } = await signUp(page, "Lou");
  await page.getByRole("button", { name: /Account menu for/ }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Log in" }).last().click();
  await expect(page.getByRole("alert").first()).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue(email);
  await expect(page.getByLabel("Password")).toHaveValue("");
  await expect(page.getByLabel("Password")).toBeFocused();
  // said once: one alert, the field points at it, and it offers the way out
  await expect(page.getByRole("alert")).toHaveCount(1);
  await expect(page.getByRole("alert")).toContainText(
    "Email or password is wrong. Try again or reset your password.",
  );
  await expect(page.getByText(/Password doesn’t match this email/)).toHaveCount(0);
  const password = page.getByLabel("Password");
  await expect(password).toHaveAttribute("aria-invalid", "true");
  await expect(password).toHaveAttribute("aria-describedby", "login-error");
  await expect(page.locator("#login-error")).toContainText("Email or password is wrong");
  await expect(
    page.locator("#login-error").getByRole("button", { name: "Forgot password?" }),
  ).toBeVisible();
});
