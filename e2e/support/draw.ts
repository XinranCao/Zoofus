import type { Page } from "@playwright/test";

/**
 * Drag on the photo in the sticker maker, between two points given as fractions of its width and
 * height: with a shape tool chosen this draws the shape (the default is a box in the middle).
 */
export async function dragOnPhoto(
  page: Page,
  from: [number, number] = [0.25, 0.25],
  to: [number, number] = [0.75, 0.75],
) {
  const canvas = page.getByTestId("lasso-well").locator("canvas").first();
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const at = ([fx, fy]: [number, number]) => ({
    x: box.x + box.width * fx,
    y: box.y + box.height * fy,
  });
  const a = at(from);
  const b = at(to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
}
