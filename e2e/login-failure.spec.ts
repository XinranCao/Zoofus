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
});
