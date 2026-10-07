import { expect, test } from "@playwright/test";
import { signUp } from "./support/flows";

test.use({ viewport: { width: 1280, height: 800 } });

// UX-045: the "tape added" note vanished before people read it and had no way on
test("the tape note stays past 4 s, offers See in Tapes and can be dismissed", async ({
  page,
}) => {
  await signUp(page, "Toast");
  await page.goto("/tapes?make=1");
  await page
    .getByRole("dialog", { name: "New tape" })
    .getByLabel("Name")
    .fill("Toast tape");
  await page.getByRole("button", { name: "Add to my tapes" }).click();
  const note = page.getByText(/^Added .* to your tapes\.$/);
  await expect(note).toBeVisible();
  await page.waitForTimeout(5500); // longer than the old 4 s
  await expect(note).toBeVisible();
  await page.getByRole("button", { name: "Dismiss" }).click();
  await expect(note).toBeHidden();

  // on the Tapes page itself there is nothing to "see": the shortcut is not offered
  await expect(page.getByRole("button", { name: "See in Tapes" })).toHaveCount(0);

  // from another page it is
  await page.goto("/friends");
  await page.getByRole("button", { name: /^Make/ }).click();
  await page.getByRole("menuitem", { name: "Tape", exact: true }).click();
  await page.getByRole("dialog", { name: "New tape" }).getByLabel("Name").fill("Second");
  await page.getByRole("button", { name: "Add to my tapes" }).click();
  await page.getByRole("button", { name: "See in Tapes" }).click();
  await expect(page).toHaveURL(/\/tapes$/);
});
