import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { patternPng } from "./png";

// The marching-ants selection (design-system/02-signature-elements.md §7) over three very
// different photos, and its animation: moving normally, frozen under reduced motion.
const OUT = "design-system/verification/lasso";

const PHOTOS = {
  dark: patternPng(480, 360, () => [18, 16, 20]),
  light: patternPng(480, 360, () => [244, 242, 236]),
  // busy: a high-contrast checker with noise, so any single line colour gets lost somewhere
  busy: patternPng(480, 360, (x, y) => {
    const on = ((x >> 3) + (y >> 3)) % 2 === 0;
    const n = ((x * 7919 + y * 104729) % 97) / 97;
    const v = Math.round((on ? 215 : 40) + (n - 0.5) * 50);
    return [v, Math.round(v * (0.7 + n * 0.3)), Math.round(v * 0.8)];
  }),
} as const;

async function openLasso(page: Page, photo: Buffer) {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(`lasso-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Nickname · 昵称").fill("Lasso");
  await page.getByRole("button", { name: "Start cutting" }).click();
  await expect(page).toHaveTitle("Zoofus · Make a sticker");
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "photo.png",
    mimeType: "image/png",
    buffer: photo,
  });
  const maker = page.getByRole("dialog", { name: "Draw around it" });
  await maker.getByRole("radio", { name: /Rectangle/ }).click();
  await maker.getByRole("button", { name: "Add shape" }).click();
  return maker;
}

/** Luminance contrast of the selection line against the photo around it, from the stage canvas. */
function lineVisibility(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(
      '[data-testid="lasso-well"] .konvajs-content canvas',
    );
    if (!canvas) throw new Error("no stage canvas");
    const ctx = canvas.getContext("2d")!;
    const { width: w, height: h } = canvas;
    const data = ctx.getImageData(0, 0, w, h).data;
    const lum = (i: number) => {
      const f = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(data[i]!) + 0.7152 * f(data[i + 1]!) + 0.0722 * f(data[i + 2]!);
    };
    const near = (i: number, rgb: number[], tol: number) =>
      Math.abs(data[i]! - rgb[0]!) < tol &&
      Math.abs(data[i + 1]! - rgb[1]!) < tol &&
      Math.abs(data[i + 2]! - rgb[2]!) < tol;
    const SHEET = [251, 246, 238];
    const LODEN = [65, 71, 14];
    const out = {
      sheet: { n: 0, ratios: [] as number[] },
      loden: { n: 0, ratios: [] as number[] },
    };
    const step = 3;
    for (let y = 8; y < h - 8; y += 1) {
      for (let x = 8; x < w - 8; x += step) {
        const i = (y * w + x) * 4;
        const kind = near(i, SHEET, 6) ? "sheet" : near(i, LODEN, 6) ? "loden" : null;
        if (!kind) continue;
        // the photo 7px either side of the line (skipping anything that is itself line colour)
        const around: number[] = [];
        for (const [dx, dy] of [
          [7, 0],
          [-7, 0],
          [0, 7],
          [0, -7],
        ] as const) {
          const j = ((y + dy) * w + (x + dx)) * 4;
          if (!near(j, SHEET, 6) && !near(j, LODEN, 6)) around.push(lum(j));
        }
        if (!around.length) continue;
        const bg = around.reduce((a, b) => a + b, 0) / around.length;
        const l = lum(i);
        out[kind].n++;
        out[kind].ratios.push((Math.max(l, bg) + 0.05) / (Math.min(l, bg) + 0.05));
      }
    }
    const median = (a: number[]) =>
      a.length ? [...a].sort((p, q) => p - q)[a.length >> 1]! : 0;
    return {
      sheetPixels: out.sheet.n,
      lodenPixels: out.loden.n,
      sheetContrast: median(out.sheet.ratios),
      lodenContrast: median(out.loden.ratios),
    };
  });
}

for (const [name, buffer] of Object.entries(PHOTOS)) {
  test(`the selection line is visible over a ${name} photo`, async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    await page.emulateMedia({ reducedMotion: "reduce" }); // a still frame to measure
    await page.setViewportSize({ width: 1280, height: 800 });
    await openLasso(page, buffer);
    await page.waitForTimeout(500);
    await page.getByTestId("lasso-well").screenshot({ path: `${OUT}/${name}.png` });
    const v = await lineVisibility(page);
    // all three strokes are drawn ...
    expect(v.sheetPixels, JSON.stringify(v)).toBeGreaterThan(40);
    expect(v.lodenPixels, JSON.stringify(v)).toBeGreaterThan(40);
    // ... and over this photo at least one of the two line colours stands clear of it
    expect(
      Math.max(v.sheetContrast, v.lodenContrast),
      JSON.stringify(v),
    ).toBeGreaterThanOrEqual(3);
  });
}

test("the ants march, and stand still under reduced motion", async ({
  page,
  browser,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openLasso(page, PHOTOS.busy);
  const well = page.getByTestId("lasso-well");
  const a = await well.screenshot();
  await page.waitForTimeout(250); // a fraction of the 600 ms cycle
  const b = await well.screenshot();
  expect(a.equals(b), "the dashes should move").toBe(false);

  const still = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  const p2 = await still.newPage();
  await openLasso(p2, PHOTOS.busy);
  const w2 = p2.getByTestId("lasso-well");
  const c = await w2.screenshot();
  await p2.waitForTimeout(1000);
  const d = await w2.screenshot();
  expect(c.equals(d), "the dashes must not move").toBe(true);
  await still.close();
});
