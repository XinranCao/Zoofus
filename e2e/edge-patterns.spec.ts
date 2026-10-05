import { expect, test } from "@playwright/test";
import { solidPng } from "./png";
import { signUp } from "./support/flows";

test.use({ viewport: { width: 1280, height: 800 } });

// UX-042: a print on the same colour as its paper looked blank. UX-044: the Library tile kept the
// old edge after "Edge saved.".
test("a pattern shows with the default colours, and the tile shows a new edge at once", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signUp(page, "Edge");
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
  const preview = dlg.getByRole("img", { name: "Sticker preview" });
  await expect(preview).toBeVisible();
  const pixels = () => preview.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  // the preview is drawn again after the first frame, so read it once it has settled
  const settled = async () => {
    let last = await pixels();
    await expect
      .poll(async () => {
        const next = await pixels();
        const same = next === last;
        last = next;
        return same;
      })
      .toBe(true);
    return last;
  };
  let plain = await settled();
  for (const kind of ["Stripes", "Dots", "Gingham", "Check", "Wave"]) {
    await dlg.getByRole("radio", { name: kind }).click();
    expect(await settled(), `${kind} differs from plain`).not.toBe(plain);
    await dlg.getByRole("radio", { name: "Solid" }).click();
    plain = await settled();
  }
  await dlg.getByRole("button", { name: "Save to Library" }).click();
  await expect(dlg.getByText("Saved to your Library.", { exact: true })).toBeVisible();
  await dlg.getByRole("button", { name: "See it in Library" }).click();

  const tile = page.locator(".zf-tile img").first();
  await expect(tile).toBeVisible();
  const before = await tile.getAttribute("src");
  await page.getByRole("button", { name: /^Open Cut / }).click();
  await page.getByRole("button", { name: "Edit edge" }).click();
  const edit = page.getByRole("dialog", { name: "Edit the edge" });
  await edit.getByRole("radio", { name: "Torn" }).click();
  await edit.getByRole("radio", { name: "Stripes" }).click();
  await edit.getByRole("button", { name: "Save edge" }).click();
  await expect(page.getByText("Edge saved.", { exact: true }).last()).toBeVisible();
  await expect(edit).toBeHidden();
  // no reload: the tile already shows the new picture, loaded
  const now = page.locator(".zf-tile img").first();
  expect(await now.getAttribute("src")).not.toBe(before);
  expect(
    await now.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0),
  ).toBe(true);
});
