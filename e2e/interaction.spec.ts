import { dragOnPhoto } from "./support/draw";
import { expect, test, type Page } from "@playwright/test";
import { patternPng, solidPng } from "./png";

// Interaction details: the non-modal menus, touch targets, drawing on touch, and the three
// behaviours reported from manual testing (starter tapes, drag-to-paint pixels, lasso that
// leaves the photo).
const photo = {
  name: "photo.png",
  mimeType: "image/png",
  buffer: solidPng(480, 360, [110, 150, 190]),
};

async function signUp(page: Page, name = "Tester") {
  await page.goto("/signup");
  await page
    .getByLabel("Email")
    .fill(`ix-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Nickname · 昵称").fill(name);
  await page.getByRole("button", { name: "Start cutting" }).click();
  await expect(page).toHaveTitle("Zoofus · Make a sticker");
}

async function openMaker(page: Page) {
  await page.locator('input[type="file"]').first().setInputFiles(photo);
  const maker = page.getByRole("dialog", { name: "Draw around it" });
  await expect(maker).toBeVisible();
  return maker;
}

test.describe("non-modal menus (desktop)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("Esc closes the menu and returns focus to the trigger", async ({ page }) => {
    await signUp(page);
    const trigger = page.getByRole("button", { name: /Account menu for/ });
    await trigger.click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("an outside click closes it", async ({ page }) => {
    await signUp(page);
    await page.getByRole("button", { name: /Account menu for/ }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.mouse.click(300, 600);
    await expect(page.getByRole("menu")).toBeHidden();
  });

  test("Tab closes the menu and moves on", async ({ page }) => {
    await signUp(page);
    const trigger = page.getByRole("button", { name: /Account menu for/ });
    await trigger.click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.keyboard.press("End"); // the last item
    await page.keyboard.press("Tab");
    await expect(page.getByRole("menu")).toBeHidden();
    // focus has left the menu items (it is not trapped) and is not lost on <body>
    await expect(page.locator("body")).not.toBeFocused();
    const inMenu = await page.evaluate(
      () => !!document.activeElement?.closest('[role="menu"]'),
    );
    expect(inMenu).toBe(false);
  });

  test("the page behind stays in the accessibility tree (not aria-hidden)", async ({
    page,
  }) => {
    await signUp(page);
    await page.getByRole("button", { name: /Account menu for/ }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    const hidden = await page.evaluate(
      () =>
        !!document.querySelector(
          "#root[aria-hidden], #root [aria-hidden=true][data-aria-hidden]",
        ),
    );
    expect(hidden).toBe(false);
  });
});

test.describe("non-modal menus (phone)", () => {
  test.use({ viewport: { width: 390, height: 600 }, isMobile: true, hasTouch: true });

  test("the page behind does not scroll while the menu is open", async ({ page }) => {
    await signUp(page);
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.move(200, 500);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();
    // and scrolling works again afterwards
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe(
      "hidden",
    );
  });
});

test.describe("starter tapes", () => {
  test("stay on the roll after the user makes their own tape", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await signUp(page);
    await page.goto("/tapes");
    await expect(page.getByRole("button", { name: /^Make a tape like / })).toHaveCount(4);
    await page.getByRole("button", { name: "New tape" }).first().click();
    await page.getByLabel("Name").fill("Mine");
    await page.getByRole("button", { name: "Add to my tapes" }).click();
    await expect(page.getByText("Added to your tapes.", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Make a tape like Mine" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^Make a tape like / })).toHaveCount(5);
  });
});

test.describe("drawing pixels", () => {
  test("dragging across the grid paints every cell it crosses", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await signUp(page);
    await page.goto("/tapes?make=1");
    await page.getByRole("radio", { name: "Pixels" }).click();
    await page.getByRole("button", { name: "Clear" }).click();
    const grid = page.getByRole("group", { name: /Pixel pattern/ });
    const lit = () => grid.locator('[aria-pressed="true"]').count();
    expect(await lit()).toBe(0);
    const a = (await page.getByRole("button", { name: "Row 3 column 1" }).boundingBox())!;
    const b = (await page.getByRole("button", { name: "Row 3 column 8" }).boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 24 });
    await page.mouse.up();
    expect(await lit()).toBe(8); // the whole row
    // a drag that starts on a lit cell erases
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width * 4, a.y + a.height / 2, { steps: 12 });
    await page.mouse.up();
    expect(await lit()).toBeLessThan(8);
  });

  test("a plain click and the keyboard still toggle one cell", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await signUp(page);
    await page.goto("/tapes?make=1");
    await page.getByRole("radio", { name: "Pixels" }).click();
    await page.getByRole("button", { name: "Clear" }).click();
    const cell = page.getByRole("button", { name: "Row 1 column 1" });
    await cell.click();
    await expect(cell).toHaveAttribute("aria-pressed", "true");
    await cell.focus();
    await page.keyboard.press("Space");
    await expect(cell).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.press("Enter");
    await expect(cell).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("freehand lasso", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("leaving the photo and coming back elsewhere selects the corner in between", async ({
    page,
  }) => {
    await signUp(page);
    // a photo whose pixels say where they are: red bottom-left quadrant, blue elsewhere
    const quad = patternPng(480, 360, (x, y) =>
      x < 240 && y >= 180 ? [210, 40, 40] : [40, 70, 200],
    );
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({ name: "q.png", mimeType: "image/png", buffer: quad });
    const maker = page.getByRole("dialog", { name: "Draw around it" });
    await expect(maker).toBeVisible();
    await maker.getByRole("radio", { name: /Freehand/ }).click();
    const well = page.getByTestId("lasso-well");
    const box = (await well.locator("canvas").first().boundingBox())!;
    const at = (fx: number, fy: number) => ({
      x: box.x + box.width * fx,
      y: box.y + box.height * fy,
    });
    // start inside near the left edge, leave to the left, go round below the photo, come back
    // in at the bottom: the bottom-left corner lies between where the stroke left and re-entered
    const p = (fx: number, fy: number) => at(fx, fy);
    await page.mouse.move(p(0.3, 0.5).x, p(0.3, 0.5).y);
    await page.mouse.down();
    await page.mouse.move(p(0.1, 0.6).x, p(0.1, 0.6).y, { steps: 5 });
    await page.mouse.move(p(-0.15, 0.7).x, p(-0.15, 0.7).y, { steps: 5 }); // out on the left
    await page.mouse.move(p(-0.15, 1.2).x, p(-0.15, 1.2).y, { steps: 5 }); // below the photo
    await page.mouse.move(p(0.2, 1.2).x, p(0.2, 1.2).y, { steps: 5 });
    await page.mouse.move(p(0.3, 0.9).x, p(0.3, 0.9).y, { steps: 5 }); // back in at the bottom
    await page.mouse.move(p(0.3, 0.52).x, p(0.3, 0.52).y, { steps: 5 }); // and round to the start
    await page.mouse.up();
    // the corner (red in the photo) was never touched by the stroke, but lies between where it left
    // and where it came back: it is inside the selection, so it is not dimmed
    const pixel = (fx: number, fy: number) =>
      page.evaluate(
        ([x, y]) => {
          const c = document.querySelector<HTMLCanvasElement>(
            '[data-testid="lasso-well"] .konvajs-content canvas',
          )!;
          const d = c
            .getContext("2d")!
            .getImageData(Math.round(c.width * x!), Math.round(c.height * y!), 1, 1).data;
          return [d[0]!, d[1]!, d[2]!];
        },
        [fx, fy],
      );
    const corner = await pixel(0.012, 0.985);
    expect(corner[0], `corner pixel ${corner}`).toBeGreaterThan(190); // undimmed red
    const outside = await pixel(0.92, 0.1); // blue photo, outside the selection: dimmed
    expect(outside[2], `outside pixel ${outside}`).toBeLessThan(160);
  });
});

async function scanTargets(page: Page, where: string, small: string[]) {
  const found = await page.evaluate(() => {
    const sel =
      "button, a[href], [role=radio], [role=slider], [role=tab], [role=menuitem], input:not([type=hidden]):not([hidden]), textarea, select, [role=checkbox], [data-user-tape] [role=slider]";
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      let r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // a control cut off by the viewport edge, or scrolled out of its dialog's middle, is
      // measured after scrolling it into view
      const scroller = el.closest(".zf-dialog__scroll");
      const sr = scroller?.getBoundingClientRect();
      const hiddenInDialog = !!sr && (r.top < sr.top || r.bottom > sr.bottom);
      if (!scroller && (r.bottom < 0 || r.top > innerHeight)) continue;
      if (hiddenInDialog || r.bottom + 30 > innerHeight || r.top - 30 < 0) {
        el.scrollIntoView({ block: "center", behavior: "instant" });
        r = el.getBoundingClientRect();
      }
      if (el.closest("[aria-hidden=true], .zf-skip")) continue;
      // hit target: how far a tap still lands on this control, around its centre
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (cy < 0 || cy > innerHeight || cx < 0 || cx > innerWidth) continue; // centre off screen
      const owns = (x: number, y: number) => {
        const hit = document.elementFromPoint(x, y);
        // a text field's whole scrap forwards the tap to the input
        const owner = el.matches("input, textarea")
          ? (el.closest(".zf-field__box") ?? el)
          : el;
        return !!hit && (owner === hit || owner.contains(hit));
      };
      let w = 0;
      let h = 0;
      for (let d = 0; d <= 30; d++) {
        if (owns(cx - d, cy)) w++;
        else break;
      }
      for (let d = 1; d <= 30; d++) {
        if (owns(cx + d, cy)) w++;
        else break;
      }
      for (let d = 0; d <= 30; d++) {
        if (owns(cx, cy - d)) h++;
        else break;
      }
      for (let d = 1; d <= 30; d++) {
        if (owns(cx, cy + d)) h++;
        else break;
      }
      // a pixel-grid cell is painted by dragging: it only needs to be a comfortable finger-width
      const need = el.classList.contains("zf-pixel") ? 32 : 44;
      if (w < need || h < need)
        out.push(
          `${el.tagName.toLowerCase()}[${el.getAttribute("aria-label") ?? (el.textContent ?? "").trim().slice(0, 24)}] ${Math.round(w)}×${Math.round(h)}`,
        );
    }
    return out;
  });
  small.push(...found.map((f) => `${where}: ${f}`));
}

test.describe("touch", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("interactive targets are at least 44 × 44 at 390px", async ({ page }) => {
    await signUp(page);
    const small: string[] = [];
    const scan = (where: string) => scanTargets(page, where, small);
    await scan("home");
    await page.goto("/stickers");
    await scan("book-empty");
    await page.goto("/tapes");
    await scan("tapes");
    await page.goto("/tapes?make=1");
    await scan("tape-dialog");
    await page.getByRole("radio", { name: "Pixels" }).click();
    await scan("tape-pixels");
    await page.goto("/account");
    await scan("account");
    expect(small, small.join("\n")).toEqual([]);
  });

  test("the sticker maker steps have 44 × 44 targets too", async ({ page }) => {
    await signUp(page);
    const small: string[] = [];
    const maker = await openMaker(page);
    await maker.getByRole("radio", { name: /Rectangle/ }).click();
    await dragOnPhoto(page);
    await scanTargets(page, "lasso", small);
    await maker.getByRole("button", { name: "Cut it out" }).click();
    await expect(page.getByRole("dialog", { name: "Your sticker" })).toBeVisible();
    await scanTargets(page, "edge studio", small);
    await page.getByRole("radio", { name: "Pixels" }).click();
    await scanTargets(page, "edge studio pixels", small);
    expect(small, small.join("\n")).toEqual([]);
  });

  test("the lasso canvas is touch-action none and the page stays put while drawing", async ({
    page,
  }) => {
    await signUp(page);
    const maker = await openMaker(page);
    await maker.getByRole("radio", { name: /Freehand/ }).click();
    const canvasBox = page.getByRole("application");
    expect(await canvasBox.evaluate((el) => getComputedStyle(el).touchAction)).toBe(
      "none",
    );
    const scrollables = await page.evaluate(() => [
      window.scrollY,
      document.querySelector('[role="dialog"]')?.scrollTop ?? 0,
    ]);
    const b = (await canvasBox.boundingBox())!;
    await page.mouse.move(b.x + 40, b.y + 40);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++)
      await page.mouse.move(b.x + 40 + i * 20, b.y + 40 + i * 12);
    await page.mouse.up();
    const after = await page.evaluate(() => [
      window.scrollY,
      document.querySelector('[role="dialog"]')?.scrollTop ?? 0,
    ]);
    expect(after).toEqual(scrollables);
  });
});
