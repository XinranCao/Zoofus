import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  inspect,
  isCjkFont,
  watchFonts,
  type ContrastRow,
  type Problem,
} from "./support/ds-checks";
import { makeT, type Lang } from "./support/i18n";
import { solidPng } from "./png";

// Verification of the design system on the real app. Every one of the 23 states of every screen
// is visited at 390 × 844 and 1280 × 800, in English and in Chinese, and again with reduced
// motion; screenshots land in design-system/verification/ and the automated rules run on each
// (see e2e/support/ds-checks.ts).
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
] as const;
const OUT = "design-system/verification";

const VARIANTS: { lang: Lang; reduced: boolean }[] = [
  { lang: "en", reduced: false },
  { lang: "zh", reduced: false },
  { lang: "en", reduced: true },
];

const photo = {
  name: "photo.png",
  mimeType: "image/png",
  buffer: solidPng(480, 360, [110, 150, 190]),
};

for (const variant of VARIANTS) {
  for (const vp of VIEWPORTS) {
    const tag = `${variant.lang}${variant.reduced ? "-reduced" : ""}/${vp.name}`;
    test(`every screen follows the design system: ${tag} (${vp.width}px)`, async ({
      browser,
    }) => {
      test.setTimeout(240_000);
      const { t, rx } = makeT(variant.lang);
      const dir =
        variant.lang === "zh"
          ? `${OUT}/zh/${vp.name}`
          : variant.reduced
            ? `test-results/reduced/${vp.name}`
            : `${OUT}/${vp.name}`;
      mkdirSync(dir, { recursive: true });
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.name === "mobile",
        hasTouch: vp.name === "mobile",
        locale: variant.lang === "zh" ? "zh-CN" : "en-US",
        reducedMotion: variant.reduced ? "reduce" : "no-preference",
      });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      const fontFiles = watchFonts(page);
      const problems: Problem[] = [];
      const contrast: ContrastRow[] = [];
      const fontsSeen = new Set<string>();
      const shot = async (screen: string) => {
        if (process.env.DS_FONT_LOG)
          console.log(screen, fontFiles.filter(isCjkFont).length);
        problems.push(
          ...(await inspect(page, `${tag}/${screen}`, {
            shotPath: `${dir}/${screen}.png`,
            cdp,
            zh: variant.lang === "zh",
            reduced: variant.reduced,
            contrast,
            fontsSeen,
          })),
        );
      };
      const email = `ds-${variant.lang}-${vp.name}-${Date.now()}@example.com`;
      const maker = () => page.getByRole("dialog", { name: t("maker.title.lasso") });
      const upload = (file: { name: string; mimeType: string; buffer: Buffer }) =>
        page.locator('input[type="file"]').first().setInputFiles(file);

      // --- auth ---
      await page.goto("/login");
      await shot("01-login");
      await page.getByLabel(t("auth.email")).fill("nobody@example.com");
      await page.getByLabel(t("auth.password")).fill("wrongpass1");
      await page.getByRole("button", { name: t("auth.login.submit") }).click();
      await expect(page.getByText(t("auth.errors.login"))).toBeVisible();
      await shot("02-login-error");
      await page.getByRole("button", { name: t("auth.login.forgot") }).click();
      await expect(
        page.getByRole("dialog", { name: t("auth.reset.title") }),
      ).toBeVisible();
      await shot("03-reset-dialog");
      await page.keyboard.press("Escape");

      await page.goto("/signup");
      await shot("04-signup-step1");
      await page.getByLabel(t("auth.email")).fill(email);
      await page.getByLabel(t("auth.password")).fill("short");
      await page.getByRole("button", { name: t("auth.signup.continue") }).click();
      await expect(page.getByText(t("auth.errors.passwordShort"))).toBeVisible();
      await shot("05-signup-field-error");
      await page.getByLabel(t("auth.password")).fill("secret123");
      await page.getByRole("button", { name: t("auth.signup.continue") }).click();
      await expect(page.getByText(t("auth.signup.kicker2"))).toBeVisible();
      await shot("06-signup-step2");
      await page.getByLabel(t("auth.nickname")).fill("Mei");
      await page.getByRole("button", { name: t("auth.signup.start") }).click();
      await expect(page.getByRole("heading", { name: t("home.title") })).toBeVisible();

      // --- home (empty), menu ---
      await shot("07-home-empty");
      if (vp.name === "mobile")
        await page.getByRole("button", { name: t("common.menu") }).click();
      else await page.getByRole("button", { name: rx("nav.accountMenu") }).click();
      await expect(page.getByRole("menu")).toBeVisible();
      await shot("08-menu-open");
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: t("home.how") }).click();
      await shot("09-how-it-works");
      await page.keyboard.press("Escape");

      // --- sticker book (empty) → maker states ---
      await page.goto("/stickers");
      await expect(page.getByText(t("book.emptyTitle"))).toBeVisible();
      await shot("10-book-empty");
      await page.getByRole("button", { name: t("book.makeFirst") }).click();
      await expect(
        page.getByRole("dialog", { name: t("maker.title.empty") }),
      ).toBeVisible();
      await shot("11-maker-empty");
      await upload({
        name: "notes.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("not an image"),
      });
      await expect(page.getByText(t("maker.errors.title"))).toBeVisible();
      await shot("12-maker-error");
      await upload(photo);
      await expect(maker()).toBeVisible();
      await maker()
        .getByRole("radio", { name: t("maker.shapes.rectangle") })
        .click();
      await maker()
        .getByRole("button", { name: t("maker.addShape") })
        .click();
      await shot("13-maker-lasso");
      await maker()
        .getByRole("radio", { name: t("maker.deselect"), exact: true })
        .click();
      await shot("14-maker-deselect-mode");
      await maker()
        .getByRole("radio", { name: t("maker.select"), exact: true })
        .click();
      await maker()
        .getByRole("button", { name: t("maker.cutIt") })
        .click();
      await expect(
        page.getByRole("dialog", { name: t("maker.title.result") }),
      ).toBeVisible();
      await expect(
        page.getByRole("img", { name: t("maker.edge.preview") }),
      ).toBeVisible();
      await shot("15-maker-edge-torn");
      await page.getByRole("radio", { name: t("maker.edge.shapes.wobbly") }).click();
      await page.getByRole("radio", { name: t("pattern.kinds.dots") }).click();
      await shot("16-maker-edge-pattern");
      await page.getByRole("button", { name: t("maker.edge.save") }).click();
      await expect(page.getByText(t("maker.edge.saved"), { exact: true })).toBeVisible();
      await page
        .getByRole("button", { name: t("common.close") })
        .first()
        .click();

      // --- book (grid), detail, edit edge ---
      await page.goto("/stickers");
      const open = page.getByRole("button", { name: rx("book.preview") });
      await expect(open).toBeVisible();
      await shot("17-book-grid");
      await open.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await shot("18-sticker-detail");
      await page.getByRole("button", { name: t("book.editEdge") }).click();
      await expect(
        page.getByRole("dialog", { name: t("book.editEdgeTitle") }),
      ).toBeVisible();
      await expect(
        page.getByRole("img", { name: t("maker.edge.preview") }),
      ).toBeVisible();
      await shot("19-edit-edge");
      await page.getByRole("button", { name: t("common.cancel") }).click();

      // --- tape, account, delete, 404 ---
      await page.goto("/tape");
      await expect(page.getByRole("heading", { name: t("tape.title") })).toBeVisible();
      await shot("20-tape-studio");
      await page.goto("/account");
      await shot("21-account");
      await page.getByRole("button", { name: t("account.deleteButton") }).click();
      await shot("22-account-delete-dialog");
      await page.keyboard.press("Escape");
      await page.goto("/nothing-here");
      await shot("23-not-found");

      // English pages never fetch a CJK font; Chinese pages fetch only slices (not all of them)
      const cjk = fontFiles.filter(isCjkFont);
      if (variant.lang === "en")
        expect(
          cjk,
          `CJK fonts downloaded on English pages: ${cjk.slice(0, 3).join(", ")}`,
        ).toEqual([]);
      else
        expect(cjk.length, "Chinese text should load CJK font slices").toBeGreaterThan(0);

      // keep the lowest contrast pairs as an artefact, worst first
      const lowest = [...contrast]
        .sort((a, b) => a.ratio / a.min - b.ratio / b.min)
        .slice(0, 20);
      mkdirSync(`${OUT}/contrast`, { recursive: true });
      writeFileSync(
        `${OUT}/contrast/${tag.replace("/", "-")}.json`,
        JSON.stringify(
          { checked: contrast.length, lowest, cjkFonts: [...fontsSeen] },
          null,
          2,
        ),
      );

      await context.close();
      expect(
        problems,
        problems.map((p) => `${p.screen}: ${p.rule} → ${p.detail}`).join("\n"),
      ).toEqual([]);
    });
  }
}

test("the dev gallery renders", async ({ page }: { page: Page }) => {
  mkdirSync(`${OUT}/desktop`, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/dev/design-system");
  await page.waitForTimeout(600);
  await page.screenshot({
    path: `${OUT}/desktop/00-dev-design-system.png`,
    fullPage: true,
  });
});
