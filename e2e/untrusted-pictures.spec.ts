import { expect, test } from "@playwright/test";
import { signUp } from "./support/flows";

// A friend's data can name any picture address. Planted straight into the emulator (bypassing the
// rules, as an Admin write could), the app must still never request it: a placeholder shows.
const DOCS =
  "http://127.0.0.1:8080/v1/projects/demo-zoofus/databases/(default)/documents";
const EVIL = "https://evil.example/pixel.png";
const str = (stringValue: string) => ({ stringValue });
const put = (path: string, fields: object) =>
  fetch(`${DOCS}/${path}`, {
    method: "PATCH",
    headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  }).then((r) => expect(r.ok, path).toBe(true));

test("a picture address that is not the app's own storage is never requested", async ({
  page,
}) => {
  const requested: string[] = [];
  await page.route(/evil\.example/, (route) => {
    requested.push(route.request().url());
    return route.abort();
  });
  await signUp(page, "Victim");
  const me = await page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const open = indexedDB.open("firebaseLocalStorageDb");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const all = open.result
            .transaction("firebaseLocalStorage")
            .objectStore("firebaseLocalStorage")
            .getAll();
          all.onsuccess = () =>
            resolve(
              (
                all.result.find((r: { value?: { uid?: string } }) => r.value?.uid) as {
                  value: { uid: string };
                }
              ).value.uid,
            );
        };
      }),
  );
  const now = new Date().toISOString();

  // a "friend" whose public profile picture, and whose share, point at an outside address
  await put("publicProfiles/ghost", {
    nickname: str("Ghost"),
    avatarUrl: str(EVIL),
    avatarKind: str("photo"),
    friendCode: str("GHOST234"),
  });
  await put(`users/${me}/friends/ghost`, { since: { timestampValue: now } });
  await put(`users/${me}/inbox/evil1`, {
    from: str("ghost"),
    kind: str("sticker"),
    name: str("Tracker"),
    payload: {
      mapValue: {
        fields: {
          name: str("Tracker"),
          imageUrl: str(EVIL),
          width: { integerValue: "10" },
          height: { integerValue: "10" },
        },
      },
    },
    files: { arrayValue: { values: [] } },
    seen: { booleanValue: false },
    createdAt: { timestampValue: now },
  });

  await page.goto("/friends");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await page.waitForTimeout(1500);
  await page.getByRole("radio", { name: /Shared with you/ }).click();
  await expect(page.getByText("Tracker").first()).toBeVisible();
  await page.waitForTimeout(1500);

  const srcs = await page
    .locator("img")
    .evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src));
  expect(srcs.filter((s) => s.includes("evil.example"))).toEqual([]);
  expect(requested).toEqual([]);
});
