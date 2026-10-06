import { expect, test } from "@playwright/test";
import { signUp } from "./support/flows";

test.use({ viewport: { width: 1280, height: 800 } });

// UX-046: on a slow connection a list used to be blank for seconds. The page is loaded fresh each
// time (no cached list) and every database request is held back for 3 s.
test("each list shows a skeleton and a status while it loads, never a blank page", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signUp(page, "Slow");
  const lists = [
    { path: "/journals", text: /Loading your journals/ },
    { path: "/stickers", text: /Loading your stickers/ },
    { path: "/tapes", text: /Loading your tapes/ },
    { path: "/friends", text: /Loading your friends/ },
  ];
  await page.route(/:8080\//, async (route) => {
    await new Promise((r) => setTimeout(r, 3000));
    await route.continue().catch(() => {});
  });
  for (const { path, text } of lists) {
    await page.goto(path);
    await expect(page.getByRole("status").filter({ hasText: text })).toBeVisible({
      timeout: 2800,
    });
    await expect(page.locator('[aria-busy="true"]').first()).toBeVisible();
    // and then the list (or its empty state) replaces it
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 });
  }
});
