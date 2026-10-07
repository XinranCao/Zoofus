import { expect, test, type Page } from "@playwright/test";
import { makeSticker, signUp } from "./support/flows";

// A tile shows a small picture (320 px, at most 20 kB), not the full sticker file. A sticker saved
// before small pictures existed shows its full file until one is made for it, out of sight.
const AUTH = "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";
const FIRESTORE =
  "http://127.0.0.1:8080/v1/projects/demo-zoofus/databases/(default)/documents";
const ADMIN = { Authorization: "Bearer owner", "content-type": "application/json" };
const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const str = (stringValue: string) => ({ stringValue });
const int = (n: number) => ({ integerValue: String(n) });

async function put(path: string, fields: Record<string, unknown>) {
  const r = await fetch(`${FIRESTORE}/${path}`, {
    method: "PATCH",
    headers: ADMIN,
    body: JSON.stringify({ fields }),
  });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
}

async function read(path: string) {
  const r = await fetch(`${FIRESTORE}/${path}`, { headers: ADMIN });
  return r.ok
    ? ((await r.json()) as { fields: Record<string, { stringValue?: string }> })
    : null;
}

/** The file names of the sticker pictures a page asks Storage for. */
function watchStickerFiles(page: Page) {
  const seen: string[] = [];
  page.on("request", (r) => {
    const m = /\/o\/([^?]*stickers%2F[^?]*)/.exec(r.url());
    if (m) seen.push(decodeURIComponent(m[1]!));
  });
  return seen;
}

test("a new sticker is saved with a small picture, and the Library tile asks for that, not the full file", async ({
  page,
}) => {
  await signUp(page, "Thumbs", "thumbs");
  await makeSticker(page);
  const seen = watchStickerFiles(page);
  await page.goto("/stickers");
  const img = page.locator(".zf-tile .zf-sticker-img").first();
  await expect(img).toBeVisible();
  await expect.poll(() => img.getAttribute("src")).toContain("_t.webp");
  // a small file, drawn at the size of the tile or less
  const src = (await img.getAttribute("src"))!;
  const bytes = (await (await page.request.get(src)).body()).length;
  expect(bytes).toBeLessThanOrEqual(20 * 1024);
  const natural = await img.evaluate((el) => (el as HTMLImageElement).naturalWidth);
  expect(natural).toBeLessThanOrEqual(320);
  // nothing but small pictures was requested for the grid
  const full = seen.filter((f) => !/_t\.webp$/.test(f));
  expect(full).toEqual([]);
});

test("an older sticker shows its full file, then gets a small picture of its own", async ({
  page,
}) => {
  const email = `old-thumb-${Date.now()}@example.com`;
  const res = await fetch(`${AUTH}/accounts:signUp?key=fake`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "secret123", returnSecureToken: true }),
  });
  const { localId: uid } = (await res.json()) as { localId: string };
  await put(`users/${uid}`, {
    uid: str(uid),
    nickname: str("Old"),
    profilePictureUrl: str(""),
    email: str(email),
  });
  await put(`users/${uid}/stickers/old1`, {
    name: str("Old sticker"),
    storagePath: str(`${uid}/stickers/old1.webp`),
    imageUrl: str(PIXEL),
    width: int(96),
    height: int(76),
    createdAt: { timestampValue: new Date(Date.now() - 60_000).toISOString() },
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.goto("/stickers");
  const img = page.locator(".zf-tile .zf-sticker-img").first();
  await expect(img).toBeVisible();
  // it still shows (the full file) ...
  expect(await img.getAttribute("src")).toBe(PIXEL);
  // ... and, out of sight, a small picture is made and kept (its place in the list does not change)
  await expect
    .poll(
      async () =>
        (await read(`users/${uid}/stickers/old1`))?.fields.thumbPath?.stringValue,
      {
        timeout: 20_000,
      },
    )
    .toMatch(new RegExp(`^${uid}/stickers/old1_\\d+_t\\.webp$`));
  await expect
    .poll(() => img.getAttribute("src"), { timeout: 10_000 })
    .toContain("_t.webp");
});
