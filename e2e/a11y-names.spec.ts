import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { makeSticker, signUp } from "./support/flows";

// Every control has a name a screen reader can say: axe's label / name rules on the screens
// where people write, choose and draw (New journal, the journal studio, the Library, New tape).
test.use({ viewport: { width: 1280, height: 800 } });

const RULES = [
  "label",
  "button-name",
  "link-name",
  "aria-input-field-name",
  "select-name",
  "input-button-name",
  "aria-toggle-field-name",
  "aria-command-name",
];

async function names(page: Page, screen: string) {
  const r = await new AxeBuilder({ page }).withRules(RULES).analyze();
  const bad = r.violations.map(
    (v) => `${screen}: ${v.id} ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
  );
  expect(bad, bad.join("\n")).toEqual([]);
}

test("controls have accessible names on Library, journals, studio and dialogs", async ({
  page,
}) => {
  await signUp(page, "Axe");
  await makeSticker(page);

  await page.goto("/stickers");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await names(page, "stickers");

  await page.goto("/tapes");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await names(page, "tapes");

  await page.goto("/tapes?make=1");
  const tape = page.getByRole("dialog");
  await expect(tape).toBeVisible();
  await names(page, "new tape");
  await page.keyboard.press("Escape");

  await page.goto("/journals");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await names(page, "journals");

  await page.goto("/journals?make=1");
  const dlg = page.getByRole("dialog", { name: "New journal" });
  await expect(dlg).toBeVisible();
  await names(page, "new journal");
  await dlg.getByRole("button", { name: "Start" }).click();
  await expect(page).toHaveURL(/\/journals\/[\w-]+$/);
  await page.waitForTimeout(800);
  await names(page, "journal studio");
});
