import { expect, test, type Page } from "@playwright/test";

// A journal keeps its items in a document of its own, so a list stays light. Journals saved before
// that still list and open, and are moved over quietly. Documents are written straight to the
// emulators (rules bypassed), as an earlier client left them.
const FIRESTORE =
  "http://127.0.0.1:8080/v1/projects/demo-zoofus/databases/(default)/documents";
const AUTH = "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";
const ADMIN = { Authorization: "Bearer owner", "content-type": "application/json" };

const str = (stringValue: string) => ({ stringValue });
const int = (n: number) => ({ integerValue: String(n) });
const num = (n: number) => ({ doubleValue: n });
const map = (fields: Record<string, unknown>) => ({ mapValue: { fields } });
const arr = (values: unknown[]) => ({ arrayValue: { values } });

const PAGE = map({
  width: int(840),
  height: int(1188),
  paper: str("notebook"),
  pattern: str("ruled"),
  color: str("cream-100"),
});
const TEXT_ITEM = map({
  id: str("t1"),
  t: str("x"),
  text: str("Old words"),
  font: str("hand"),
  size: num(40),
  color: str("brick-600"),
  x: num(100),
  y: num(100),
  r: num(0),
  z: int(1),
});

/** A signed-up user with a profile, written straight to the emulators; the test logs in as them. */
async function account(tag: string) {
  const email = `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const res = await fetch(`${AUTH}/accounts:signUp?key=fake`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "secret123", returnSecureToken: true }),
  });
  const { localId: uid } = (await res.json()) as { localId: string };
  await put(`users/${uid}`, {
    uid: str(uid),
    nickname: str("Olde"),
    profilePictureUrl: str(""),
    email: str(email),
  });
  return { email, uid };
}

async function logIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

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
    ? ((await r.json()) as { fields: Record<string, { timestampValue?: string }> })
    : null;
}

const minutesAgo = (m: number) => ({
  timestampValue: new Date(Date.now() - m * 60_000).toISOString(),
});

test("an older journal lists and opens, then its items move into their own document", async ({
  page,
}) => {
  const { email, uid } = await account("items");
  const updated = minutesAgo(5);
  await put(`users/${uid}/journals/old1`, {
    title: str("Old trip"),
    page: PAGE,
    items: arr([TEXT_ITEM]),
    createdAt: minutesAgo(60),
    updatedAt: updated,
  });

  await logIn(page, email);
  await page.goto("/journals");
  await expect(page.getByText("Old trip")).toBeVisible();

  // moved out of sight, with the updated time kept (so the list does not reorder)
  await expect
    .poll(async () => (await read(`users/${uid}/journals/old1`))?.fields.items, {
      timeout: 15_000,
    })
    .toBeUndefined();
  const after = await read(`users/${uid}/journals/old1`);
  expect(after!.fields.updatedAt!.timestampValue).toBe(updated.timestampValue);
  expect(after!.fields.itemCount).toMatchObject({ integerValue: "1" });
  const body = await read(`users/${uid}/journals/old1/body/items`);
  expect(JSON.stringify(body)).toContain("Old words");

  // and it still opens with its words on the page
  await page.getByText("Old trip").click();
  await expect(page.locator("#journal-items")).toContainText("Old words");
});

test("the Journals screen shows 30 at a time", async ({ page }) => {
  const { email, uid } = await account("many");
  await Promise.all(
    Array.from({ length: 33 }, (_, i) =>
      put(`users/${uid}/journals/j${String(i).padStart(2, "0")}`, {
        title: str(`Page ${i}`),
        page: PAGE,
        itemCount: int(0),
        createdAt: minutesAgo(100 + i),
        updatedAt: minutesAgo(100 + i),
      }),
    ),
  );
  await logIn(page, email);
  await page.goto("/journals");
  const tiles = page.locator(".zf-jtile");
  await expect(tiles).toHaveCount(30);
  await page.getByRole("button", { name: "Show more" }).click();
  await expect(tiles).toHaveCount(33);
  await expect(page.getByRole("button", { name: "Show more" })).toHaveCount(0);
});
