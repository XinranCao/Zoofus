import { expect, test } from "@playwright/test";

// Documents written by an earlier version must never make the book or the tape roll fail to load.
// They are written straight to the emulators, bypassing the rules, exactly as an old client left them.
const AUTH = "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";
const FIRESTORE =
  "http://127.0.0.1:8080/v1/projects/demo-zoofus/databases/(default)/documents";
const ADMIN = { Authorization: "Bearer owner", "content-type": "application/json" };
const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const str = (stringValue: string) => ({ stringValue });
const int = (n: number) => ({ integerValue: String(n) });
const num = (n: number) => ({ doubleValue: n });
const list = (items: string[]) => ({ arrayValue: { values: items.map(str) } });
const map = (fields: Record<string, unknown>) => ({ mapValue: { fields } });

/** What the first version of the pattern editor saved: the default doodle includes an arc command. */
const OLD_FILL = {
  kind: str("dots"),
  bg: str("pink-200"),
  ink: str("sheet-50"),
  scale: num(12),
  angle: num(45),
  weight: num(0.4),
  pixels: list([
    "00000000",
    "01100110",
    "11111111",
    "11111111",
    "01111110",
    "00111100",
    "00011000",
    "00000000",
  ]),
  strokes: list([
    "M8 30 C14 18 22 18 26 28 S38 38 42 24",
    "M10 10 l4 4 M14 10 l-4 4",
    "M34 40 a3 3 0 1 0 0.1 0",
  ]),
};

async function post(path: string, fields: Record<string, unknown>) {
  const r = await fetch(`${FIRESTORE}/${path}`, {
    method: "POST",
    headers: ADMIN,
    body: JSON.stringify({ fields }),
  });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
}

test("the book and the tape roll still load stickers and tapes saved by an earlier version", async ({
  page,
}) => {
  const email = `legacy-${Date.now()}@example.com`;
  const res = await fetch(`${AUTH}/accounts:signUp?key=fake`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "secret123", returnSecureToken: true }),
  });
  const { localId: uid } = (await res.json()) as { localId: string };
  await post(`users?documentId=${uid}`, {
    uid: str(uid),
    nickname: str("Old"),
    profilePictureUrl: str(""),
    email: str(email),
  });
  const now = (minutes: number) => ({
    timestampValue: new Date(Date.now() - minutes * 60_000).toISOString(),
  });
  const sticker = (name: string, extra: Record<string, unknown> = {}) => ({
    name: str(name),
    storagePath: str(`${uid}/stickers/${name}.webp`),
    imageUrl: str(PIXEL),
    width: int(96),
    height: int(76),
    createdAt: now(1),
    ...extra,
  });
  // 1. an edge with the arc stroke (round 1 saved this for any sticker with a pattern fill)
  await post(
    `users/${uid}/stickers?documentId=a`,
    sticker("With old edge", {
      sourcePath: str(`${uid}/stickers/a-src.png`),
      sourceUrl: str(PIXEL),
      seed: str("a"),
      edge: map({ shape: str("wobbly"), scale: num(1), fill: map(OLD_FILL) }),
    }),
  );
  // 2. a plain sticker from before the edge editor
  await post(`users/${uid}/stickers?documentId=b`, sticker("Plain old"));
  // 3. a document nobody can read
  await post(`users/${uid}/stickers?documentId=c`, { name: int(7) });
  await post(`users/${uid}/tapes?documentId=t1`, {
    name: str("Old tape"),
    pattern: map(OLD_FILL),
    thickness: num(20),
    opacity: num(0.8),
    ends: str("torn"),
    createdAt: now(1),
  });
  await post(`users/${uid}/tapes?documentId=t2`, { name: int(7) });

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Make a sticker" })).toBeVisible();

  await page.goto("/stickers");
  await expect(page.getByRole("button", { name: "Open With old edge" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Plain old" })).toBeVisible();
  await expect(page.getByText("We couldn’t load your stickers")).toHaveCount(0);

  // an older sticker with no original opens, and says why its edge cannot be changed
  await page.getByRole("button", { name: "Open Plain old" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByText(/Made before edge editing/)
      .first(),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto("/tapes");
  await expect(
    page.getByRole("button", { name: "Make a tape like Old tape" }),
  ).toBeVisible();
  await expect(page.getByText("We couldn’t load your tapes")).toHaveCount(0);
});
