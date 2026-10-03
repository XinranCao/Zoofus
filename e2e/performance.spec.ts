import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

// Timings measured in a real browser against the dev server's modules, with the CPU slowed 4×
// (Chrome's "mid-tier mobile" profile). Numbers are saved to design-system/verification/.
const OUT = "design-system/verification";

// module URLs served by the Vite dev server: the same instances the running app uses
const TORN = "/src/paper/torn.ts";
const DIE = "/src/paper/renderSticker.ts";
const AUTH = "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";
const FIRESTORE =
  "http://127.0.0.1:8080/v1/projects/demo-zoofus/databases/(default)/documents";
const ADMIN = { Authorization: "Bearer owner", "content-type": "application/json" };
const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

/** A signed-up user with 60 stickers, written straight to the emulators. */
async function seedBook(count: number) {
  const email = `perf-${Date.now()}@example.com`;
  const res = await fetch(`${AUTH}/accounts:signUp?key=fake`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "secret123", returnSecureToken: true }),
  });
  const { localId: uid } = (await res.json()) as { localId: string };
  const str = (stringValue: string) => ({ stringValue });
  await fetch(`${FIRESTORE}/users?documentId=${uid}`, {
    method: "POST",
    headers: ADMIN,
    body: JSON.stringify({
      fields: {
        uid: str(uid),
        nickname: str("Perf"),
        profilePictureUrl: str(""),
        email: str(email),
      },
    }),
  });
  for (let i = 0; i < count; i++) {
    await fetch(
      `${FIRESTORE}/users/${uid}/stickers?documentId=s${String(i).padStart(2, "0")}`,
      {
        method: "POST",
        headers: ADMIN,
        body: JSON.stringify({
          fields: {
            name: str(`Sticker ${i + 1}`),
            storagePath: str(`${uid}/stickers/s${i}.webp`),
            imageUrl: str(PIXEL),
            width: { integerValue: "96" },
            height: { integerValue: "76" },
            createdAt: {
              timestampValue: new Date(Date.now() - i * 60_000).toISOString(),
            },
          },
        }),
      },
    );
  }
  return email;
}

test("the sticker book of 60 generates its tears in a few milliseconds, then hits the cache", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const email = await seedBook(60);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Cut something out" })).toBeVisible();

  // Chrome's mid-tier mobile profile: the CPU slowed 4×; then load the book from scratch
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.goto("/stickers");
  await expect(page.getByRole("button", { name: /^Open Sticker/ })).toHaveCount(60);
  const first = await page.evaluate(async (TORN) => {
    const torn = await import(/* @vite-ignore */ TORN);
    return { ...torn.tornStats(), cache: torn.tornCacheSize() };
  }, TORN);

  // a re-render of the whole book (switching tabs and back) must not generate anything new
  await page.getByRole("link", { name: "Tape" }).click();
  await expect(page.getByRole("heading", { name: "Tape studio" })).toBeVisible();
  const afterTape = await page.evaluate(async (TORN) => {
    const torn = await import(/* @vite-ignore */ TORN);
    return { ...torn.tornStats(), cache: torn.tornCacheSize() };
  }, TORN);
  await page.getByRole("link", { name: "Stickers" }).click();
  await expect(page.getByRole("button", { name: /^Open Sticker/ })).toHaveCount(60);
  const again = await page.evaluate(async (TORN) => {
    const torn = await import(/* @vite-ignore */ TORN);
    return { ...torn.tornStats(), cache: torn.tornCacheSize() };
  }, TORN);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });

  mkdirSync(OUT, { recursive: true });
  const report = {
    stickers: 60,
    cpuThrottle: "4x",
    bookLoad: first,
    afterTapeStudio: afterTape,
    afterReturningToBook: again,
  };
  writeFileSync(`${OUT}/performance-torn.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  // 60 tiles cost the book two tears (one per size of quiet button), not 120: the page as a whole
  // (masthead, banner, tabs, 60 tiles) generates a few dozen tears, in well under 20 ms at 4×
  expect(first.generated).toBeLessThan(40);
  expect(first.ms).toBeLessThan(20);
  // coming back to the book re-renders all 60 tiles: every tear is already cached
  expect(again.cache - afterTape.cache).toBe(0);
});

test("a torn die-cut at a 2000px long side stays well under the main-thread budget", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/login");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const result = await page.evaluate(async (DIE) => {
    const die = await import(/* @vite-ignore */ DIE);
    const src = document.createElement("canvas");
    src.width = 2000;
    src.height = 1500;
    const g = src.getContext("2d")!;
    g.fillStyle = "#c0392b";
    g.beginPath();
    g.ellipse(1000, 750, 720, 510, 0, 0, Math.PI * 2);
    g.fill();
    const edge = (shape: string, fill: object) => ({ shape, scale: 1, fill });
    const timeDie = async (shape: string, fill: object) => {
      const t0 = performance.now();
      await die.renderSticker(src, edge(shape, fill), "perf");
      return Math.round((performance.now() - t0) * 10) / 10;
    };
    const solid = { kind: "solid", bg: "sheet-50" };
    const stripes = {
      kind: "stripes",
      bg: "sheet-50",
      ink: "brick-600",
      scale: 12,
      angle: 45,
      weight: 0.5,
    };
    await timeDie("torn", solid); // warm-up
    return {
      tornSolid: await timeDie("torn", solid),
      tornStripes: await timeDie("torn", stripes),
      wobbly: await timeDie("wobbly", solid),
      smooth: await timeDie("smooth", solid),
    };
  }, DIE);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    `${OUT}/performance-diecut.json`,
    JSON.stringify({ longSide: 2000, cpuThrottle: "4x", ms: result }, null, 2),
  );
  console.log(JSON.stringify(result));
  // over 150 ms would call for an OffscreenCanvas worker
  expect(Math.max(...Object.values(result))).toBeLessThan(150);
});
