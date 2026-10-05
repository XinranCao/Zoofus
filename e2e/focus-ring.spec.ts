import { expect, test, type Page } from "@playwright/test";
import { signUp } from "./support/flows";

// Walks the Tab order on the main screens. For every control that takes focus, the area around it is
// compared with and without focus: something must change, and some changed pixel must differ from its
// unfocused self by at least 3:1 in contrast (WCAG 1.4.11).
test.use({ viewport: { width: 1280, height: 800 } });

/** Compare two PNGs in the page: how many pixels changed, and the strongest change as a contrast ratio. */
async function compare(page: Page, a: Buffer, b: Buffer) {
  return page.evaluate(
    async ([x, y]) => {
      const load = async (b64: string) => {
        const bmp = await createImageBitmap(
          await (await fetch(`data:image/png;base64,${b64}`)).blob(),
        );
        const c = document.createElement("canvas");
        c.width = bmp.width;
        c.height = bmp.height;
        const g = c.getContext("2d")!;
        g.drawImage(bmp, 0, 0);
        return g.getImageData(0, 0, c.width, c.height).data;
      };
      const [p, q] = [await load(x!), await load(y!)];
      const lum = (d: Uint8ClampedArray, i: number) => {
        const f = (v: number) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(d[i]!) + 0.7152 * f(d[i + 1]!) + 0.0722 * f(d[i + 2]!);
      };
      let changed = 0;
      let best = 1;
      for (let i = 0; i < p.length; i += 4) {
        if (
          Math.abs(p[i]! - q[i]!) +
            Math.abs(p[i + 1]! - q[i + 1]!) +
            Math.abs(p[i + 2]! - q[i + 2]!) >
          24
        ) {
          changed++;
          const l1 = lum(p, i);
          const l2 = lum(q, i);
          best = Math.max(best, (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05));
        }
      }
      return { changed, best };
    },
    [a.toString("base64"), b.toString("base64")],
  );
}

/** Measure the focused control: its surroundings with focus and without. */
async function measure(page: Page) {
  const active = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return !!el && el !== document.body;
  });
  if (!active) return null;
  await page.evaluate(() =>
    (document.activeElement as HTMLElement).scrollIntoView({
      block: "center",
      behavior: "instant",
    }),
  );
  await page.waitForTimeout(120);
  const box = await page.evaluate(() => {
    const r = (document.activeElement as HTMLElement).getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const pad = 10;
  const clip = {
    x: Math.max(0, box.x - pad),
    y: Math.max(0, box.y - pad),
    width: Math.min(1280 - Math.max(0, box.x - pad), box.w + pad * 2),
    height: Math.min(800 - Math.max(0, box.y - pad), box.h + pad * 2),
  };
  await page.waitForTimeout(120);
  const focused = await page.screenshot({ clip, animations: "disabled" });
  await page.evaluate(() => {
    (window as unknown as { __was: Element | null }).__was = document.activeElement;
    (document.activeElement as HTMLElement).blur();
  });
  const plain = await page.screenshot({ clip, animations: "disabled" });
  await page.evaluate(() => (window as unknown as { __was: HTMLElement }).__was.focus());
  return compare(page, focused, plain);
}

async function walk(page: Page, screen: string, stops = 45) {
  const bad: string[] = [];
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  for (let i = 0; i < stops; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const r = el.getBoundingClientRect();
      const name =
        el.getAttribute("aria-label") ||
        el.textContent?.trim().slice(0, 30) ||
        el.tagName;
      return { x: r.x, y: r.y, w: r.width, h: r.height, name, tag: el.tagName };
    });
    if (!info || info.w < 2 || info.h < 2) continue;
    // A page that is still drawing (lists arriving) can steal the focus between steps, so a stop that
    // fails is measured again, after Shift+Tab and Tab put the focus back, before it counts as bad.
    let last = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await page.waitForTimeout(400);
        await page.keyboard.press("Shift+Tab");
        await page.keyboard.press("Tab");
      }
      const r = await measure(page);
      if (r && r.changed >= 12 && r.best >= 3) {
        last = "";
        break;
      }
      last = `${screen}: "${info.name}" (${info.tag}) changed ${r?.changed}px, contrast ${r?.best.toFixed(2)}`;
    }
    if (last) bad.push(last);
  }
  return bad;
}

test("every control shows a visible focus indicator", async ({ page }) => {
  test.setTimeout(240_000);
  const bad: string[] = [];
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  bad.push(...(await walk(page, "login")));
  await signUp(page, "Ring");
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
    bad.push(...(await walk(page, path, 30)));
  }
  expect(bad, bad.join("\n")).toEqual([]);
});

test("forced colours show the system focus ring, and the skip link lands in main", async ({
  page,
}) => {
  await page.goto("/login");
  await page.emulateMedia({ forcedColors: "active" });
  const email = page.getByLabel("Email");
  await email.focus();
  await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement as Element);
    return `${s.outlineStyle} ${s.outlineWidth}`;
  });
  expect(outline).toMatch(/^solid 3px/);

  await page.emulateMedia({ forcedColors: "none" });
  await page.goto("/login");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await skip.focus();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});
