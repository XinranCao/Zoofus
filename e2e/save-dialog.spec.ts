import { expect, test } from "@playwright/test";
import { solidPng } from "./png";
import { dragOnPhoto } from "./support/draw";
import { signUp } from "./support/flows";

async function toSaveDialog(page: import("@playwright/test").Page) {
  await page.goto("/stickers?make=1");
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: solidPng(480, 360, [110, 150, 190]),
    });
  const maker = page.getByRole("dialog", { name: "Draw around it" });
  await maker.getByRole("button", { name: "Use the whole photo" }).click();
  await maker.getByRole("button", { name: "Cut it out" }).click();
  const dlg = page.getByRole("dialog", { name: "Your sticker" });
  await expect(dlg).toBeVisible();
  return dlg;
}

test.describe("phone", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("preview and every option are reachable, nothing hides behind the footer", async ({
    page,
  }) => {
    await signUp(page, "Phone");
    const dlg = await toSaveDialog(page);
    const scroller = dlg.locator(".zf-dialog__scroll");
    const actions = dlg.locator(".zf-dialog__actions");
    const preview = dlg.getByRole("img", { name: "Sticker preview" });

    const sbox = (await scroller.boundingBox())!;
    const pbox = (await preview.boundingBox())!;
    expect(pbox.height).toBeLessThanOrEqual(667 * 0.4); // about 40% of the screen
    expect(pbox.y).toBeGreaterThanOrEqual(sbox.y - 1);

    // scroll to the very end: the last option is above the pinned footer, the preview still shows
    await scroller.evaluate((el) => (el.scrollTop = el.scrollHeight));
    const last = dlg.getByRole("slider").last();
    const lbox = (await last.boundingBox())!;
    const abox = (await actions.boundingBox())!;
    expect(lbox.y + lbox.height).toBeLessThanOrEqual(abox.y + 1);
    const after = (await preview.boundingBox())!;
    expect(after.y).toBeGreaterThanOrEqual(sbox.y - 1);
    expect(after.y + after.height).toBeLessThanOrEqual(sbox.y + sbox.height + 1);
    await expect(dlg.getByRole("radio", { name: "Torn" })).toBeAttached();
    await dlg.getByRole("radio", { name: "Torn" }).scrollIntoViewIfNeeded();
    const tbox = (await dlg.getByRole("radio", { name: "Torn" }).boundingBox())!;
    expect(tbox.y + tbox.height).toBeLessThanOrEqual(abox.y + 1);
  });
});

// UX-036/074: on small phones and at 200% zoom the whole sticker is shown, never cropped: the
// sticker itself (its opaque pixels), not only its canvas, is inside the preview box, and the box
// is inside what the dialog shows
for (const [width, height] of [
  [375, 667],
  [360, 740],
  [640, 360],
] as const) {
  test(`the preview is whole and visible at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await signUp(page, "Small");
    await page.goto("/stickers?make=1");
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: "photo.png",
        mimeType: "image/png",
        buffer: solidPng(600, 300, [200, 60, 60]),
      });
    const maker = page.getByRole("dialog", { name: "Draw around it" });
    await maker.getByRole("radio", { name: /Star/ }).click();
    await dragOnPhoto(page);
    await maker.getByRole("button", { name: "Cut it out" }).click();
    const dlg = page.getByRole("dialog", { name: "Your sticker" });
    await expect(dlg).toBeVisible();
    const scroller = dlg.locator(".zf-dialog__scroll");
    const actions = dlg.locator(".zf-dialog__actions");
    const preview = dlg.getByRole("img", { name: "Sticker preview" });
    const stage = dlg.locator(".zf-studio__stage");
    // step 2 opens at the top of the dialog
    expect(await scroller.evaluate((el) => el.scrollTop)).toBe(0);
    await page.waitForTimeout(400);
    const p = (await preview.boundingBox())!;
    const st = (await stage.boundingBox())!;
    const sc = (await scroller.boundingBox())!;
    const ac = (await actions.boundingBox())!;
    // the stage (the preview's box) is at least 140 px high and fully in the scrolling part
    expect(st.height).toBeGreaterThanOrEqual(140);
    expect(st.y).toBeGreaterThanOrEqual(sc.y - 1);
    expect(st.y + st.height).toBeLessThanOrEqual(sc.y + sc.height + 1);
    expect(p.x).toBeGreaterThanOrEqual(st.x - 1);
    expect(p.x + p.width).toBeLessThanOrEqual(st.x + st.width + 1);
    expect(sc.y + sc.height).toBeLessThanOrEqual(ac.y + 1);
    // the sticker's own pixels do not touch the canvas edge (nothing is cut off)
    const margin = await preview.evaluate((c: HTMLCanvasElement) => {
      const g = c.getContext("2d")!;
      const { data } = g.getImageData(0, 0, c.width, c.height);
      let x0 = c.width,
        y0 = c.height,
        x1 = -1,
        y1 = -1;
      for (let y = 0; y < c.height; y++)
        for (let x = 0; x < c.width; x++)
          if (data[(y * c.width + x) * 4 + 3]! > 8) {
            x0 = Math.min(x0, x);
            x1 = Math.max(x1, x);
            y0 = Math.min(y0, y);
            y1 = Math.max(y1, y);
          }
      return Math.min(x0, y0, c.width - 1 - x1, c.height - 1 - y1);
    });
    expect(margin).toBeGreaterThanOrEqual(1);
    await expect(dlg.getByRole("button", { name: "Save to Library" })).toBeVisible();
  });
}

// UX-075/076: at 640x360 the preview stays in view while the options scroll, and "Saved" is seen
test("at 640x360 the preview stays in view while choosing, and Saved is visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 360 });
  await signUp(page, "Zoomed");
  const dlg = await toSaveDialog(page);
  const scroller = dlg.locator(".zf-dialog__scroll");
  const preview = dlg.getByRole("img", { name: "Sticker preview" });
  const inView = async (loc: typeof preview) => {
    const b = (await loc.boundingBox())!;
    const sc = (await scroller.boundingBox())!;
    return b.y >= sc.y - 1 && b.y + b.height <= sc.y + sc.height + 1;
  };
  await scroller.evaluate((el) => (el.scrollTop = el.scrollHeight)); // down to the colours
  expect(await inView(preview)).toBe(true);
  await dlg.getByRole("button", { name: "Save to Library" }).click();
  const saved = dlg.getByText("Saved to your Library.", { exact: true });
  await expect(saved).toBeVisible();
  expect(await inView(saved)).toBe(true);
  // Edit the edge: the preview is in view while the options scroll
  await dlg.getByRole("button", { name: "Edit edge" }).click();
  const edit = page.getByRole("dialog", { name: "Edit the edge" });
  await expect(edit).toBeVisible();
  const editScroller = edit.locator(".zf-dialog__scroll");
  const editPreview = edit.getByRole("img", { name: "Sticker preview" });
  await expect(editPreview).toBeVisible();
  await editScroller.evaluate((el) => (el.scrollTop = el.scrollHeight));
  const eb = (await editPreview.boundingBox())!;
  const es = (await editScroller.boundingBox())!;
  expect(eb.y).toBeGreaterThanOrEqual(es.y - 1);
  expect(eb.y + eb.height).toBeLessThanOrEqual(es.y + es.height + 1);
});

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("Save to Library is the primary button, Download image a quiet one; then See it and Make another", async ({
    page,
  }) => {
    await signUp(page, "Primary");
    const dlg = await toSaveDialog(page);
    const save = dlg.getByRole("button", { name: "Save to Library" });
    await expect(save).toHaveClass(/\bprimary\b/);
    await expect(dlg.getByRole("button", { name: "Download image" })).toHaveClass(
      /\bquiet\b/,
    );
    await save.click();
    await expect(dlg.getByText("Saved to your Library.", { exact: true })).toBeVisible();
    await expect(dlg.getByRole("button", { name: "See it in Library" })).toHaveClass(
      /\bprimary\b/,
    );
    await expect(dlg.getByRole("button", { name: "Download image" })).toHaveClass(
      /\bquiet\b/,
    );
    await dlg.getByRole("button", { name: "Make another" }).click();
    await expect(page.getByRole("dialog", { name: "Make a sticker" })).toBeVisible();
  });

  test("once saved, step 2 is read-only: no second sticker, Edit edge opens the saved one", async ({
    page,
  }) => {
    await signUp(page, "Once");
    const dlg = await toSaveDialog(page);
    // moving to step 2 is announced, and the preview says what it shows
    await expect(
      page.getByRole("status").filter({ hasText: /Step 2 of 2/i }),
    ).toHaveCount(1);
    await expect(
      dlg.getByRole("img", { name: /^Sticker preview: Wobbly/i }),
    ).toBeVisible();
    await dlg.getByRole("button", { name: "Save to Library" }).click();
    const note = dlg.getByText("Saved to your Library.", { exact: true });
    await expect(note).toBeVisible();
    // the options cannot be touched any more, so "Saved" never disappears and nothing can be saved twice
    await expect(dlg.getByRole("button", { name: "Save to Library" })).toHaveCount(0);
    await expect(dlg.getByRole("button", { name: "Back to editing" })).toHaveCount(0);
    expect(
      await dlg
        .getByRole("radio", { name: "Torn" })
        .evaluate((el) => !!el.closest("[inert]")),
    ).toBe(true);
    await expect(note).toBeVisible();
    // the lock is explained in words, in the dialog's description too, and Tab skips what is locked
    await expect(
      dlg.getByText(/Want a different edge\? Tap Edit edge\./).first(),
    ).toBeVisible();
    await expect(dlg).toHaveAccessibleDescription(/Tap Edit edge/);
    await expect(dlg.getByLabel("Name")).toBeDisabled();
    const landed: string[] = [];
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      landed.push(
        await page.evaluate(
          () =>
            (document.activeElement as HTMLElement | null)?.getAttribute("aria-label") ??
            document.activeElement?.textContent ??
            "",
        ),
      );
    }
    expect(landed.join("|")).not.toMatch(/Smooth|Wobbly|Torn|Name|Stripes|Dots/);
    // Edit edge is a real button, at least 44 px high, and opens the sticker just saved
    const edit = dlg.getByRole("button", { name: "Edit edge" });
    expect((await edit.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await edit.click();
    await expect(page).toHaveURL(/\/stickers(\?edit=[\w-]+)?$/);
    await expect(page.getByRole("dialog", { name: "Edit the edge" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".zf-tile")).toHaveCount(1);
  });
});

// PM-v1.7.6-006: the saved note is whole on a phone (it used to be clipped at 360 to 375 px)
for (const [width, height] of [
  [360, 740],
  [375, 667],
] as const) {
  test(`the saved note is whole at ${width}x${height}, and the name hint is gone once saved`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await signUp(page, "Phone");
    const dlg = await toSaveDialog(page);
    await expect(dlg.getByText(/Optional\. Without one/)).toBeVisible();
    await dlg.getByRole("button", { name: "Save to Library" }).click();
    const note = dlg.getByText("Saved to your Library.", { exact: true });
    await note.scrollIntoViewIfNeeded();
    const body = dlg.locator(".zf-toast__body", { hasText: /Tap Edit edge/ });
    await expect(body).toBeVisible();
    await expect(dlg.getByText(/Optional\. Without one/)).toHaveCount(0);
    // the text fits its own box, and the box fits what the dialog shows (nothing cut at the sides)
    const clipped = await body.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const s = el.closest(".zf-dialog__scroll")!.getBoundingClientRect();
      return (
        el.scrollWidth > el.clientWidth + 1 ||
        r.left < s.left - 1 ||
        r.right > s.right + 1
      );
    });
    expect(clipped).toBe(false);
  });
}

// PM-v1.7.6-007: a photo is never squashed in step 2, one press of Save makes one sticker
for (const [width, height] of [
  [375, 667],
  [768, 1024],
  [1440, 900],
] as const) {
  test(`the step 2 preview keeps the shape of what is drawn at ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await signUp(page, "Round");
    const dlg = await toSaveDialog(page);
    const preview = dlg.getByRole("img", { name: /^Sticker preview/ });
    await page.waitForTimeout(800); // drawn
    const { shown, drawn, dbg } = await preview.evaluate((c) => {
      const el = c as HTMLCanvasElement;
      const r = el.getBoundingClientRect();
      return {
        shown: r.width / r.height,
        drawn: el.width / el.height,
        dbg: [r.width, r.height, el.width, el.height, el.style.cssText],
      };
    });
    expect(Math.abs(shown / drawn - 1), JSON.stringify(dbg)).toBeLessThan(0.03);
  });
}

test("pressing Save twice quickly makes one sticker, and the edge slider is locked after", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await signUp(page, "Twice");
  const dlg = await toSaveDialog(page);
  await dlg.getByRole("button", { name: "Save to Library" }).dblclick();
  await expect(dlg.getByText("Saved to your Library.", { exact: true })).toBeVisible();
  await expect(dlg.getByRole("slider", { name: /Edge width/ })).toBeDisabled();
  await page.goto("/stickers");
  await expect(page.locator(".zf-grid-book .zf-tile")).toHaveCount(1);
});
