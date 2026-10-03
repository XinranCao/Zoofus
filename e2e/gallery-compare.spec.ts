import { test, type Page } from "@playwright/test";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";

// Side-by-side contact sheets: the design system's gallery.html card (left) against the same
// thing in the app (right), saved to design-system/verification/compare/<Component>.png.
// gallery.html loads React from a CDN, so this runs only on request:
//   DS_GALLERY=1 npx playwright test e2e/gallery-compare.spec.ts
const ROOT = "design-system";
const OUT = `${ROOT}/verification/compare`;

/** Primitives: the gallery component and the matching section of /dev/design-system. */
const SECTIONS: Record<string, string> = {
  Wordmark: "Wordmark and type",
  Paper: "Paper tones and tears",
  Button: "Buttons",
  Chip: "Chips and toggle group",
  ToggleGroup: "Chips and toggle group",
  TextField: "Text field",
  Slider: "Slider and colour picker",
  ColorPicker: "Slider and colour picker",
  Tape: "Tape",
  Scribble: "Lines",
  Dialog: "Dialog, toast, tooltip",
  Toast: "Dialog, toast, tooltip",
  Tooltip: "Dialog, toast, tooltip",
  Avatar: "Avatar, loaders, empty state",
  Loader: "Avatar, loaders, empty state",
  EmptyState: "Avatar, loaders, empty state",
  Sticker: "Stickers: edge shapes",
};

/** Screens: the gallery component and a screenshot saved by design-system.spec.ts / lasso.spec.ts. */
const SCREENS: Record<string, string> = {
  AuthPage: "desktop/01-login.png",
  HomePage: "desktop/07-home-empty.png",
  Masthead: "desktop/08-menu-open.png",
  AvatarMenu: "desktop/08-menu-open.png",
  NotFoundPage: "desktop/23-not-found.png",
  StickerBookPage: "desktop/17-book-grid.png",
  StickerTile: "desktop/17-book-grid.png",
  StickerMakerPage: "desktop/13-maker-lasso.png",
  LassoCanvas: "lasso/busy.png",
  StickerEdgeStudio: "desktop/16-maker-edge-pattern.png",
  PatternEditor: "desktop/16-maker-edge-pattern.png",
  TapeStudio: "desktop/20-tape-studio.png",
  CJKSpecimen: "zh/desktop/07-home-empty.png",
};

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

async function sheet(page: Page, name: string, design: Buffer, ours: Buffer) {
  const src = (b: Buffer) => `data:image/png;base64,${b.toString("base64")}`;
  await page.setContent(
    `<body style="margin:0;background:#fff;font:12px sans-serif;display:flex;gap:16px;padding:12px;align-items:flex-start">
       <figure style="margin:0;flex:1"><figcaption>design-system gallery · ${name}</figcaption><img style="width:100%" src="${src(design)}"></figure>
       <figure style="margin:0;flex:1"><figcaption>app</figcaption><img style="width:100%" src="${src(ours)}"></figure>
     </body>`,
  );
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

test.describe("gallery comparison", () => {
  test.skip(
    !process.env.DS_GALLERY,
    "set DS_GALLERY=1 (the gallery loads React from a CDN)",
  );

  test("contact sheets for every component", async ({ browser }) => {
    test.setTimeout(240_000);
    mkdirSync(OUT, { recursive: true });
    const server = createServer((req, res) => {
      const path = normalize(decodeURIComponent((req.url ?? "/").split("?")[0]!)).replace(
        /^(\.\.[/\\])+/,
        "",
      );
      const file = join(ROOT, path === "/" ? "gallery.html" : path);
      if (!existsSync(file)) return void res.writeHead(404).end();
      res.writeHead(200, {
        "content-type": MIME[extname(file)] ?? "application/octet-stream",
      });
      res.end(readFileSync(file));
    }).listen(5180);
    try {
      const gallery = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      await gallery.goto("http://localhost:5180/gallery.html");
      await gallery.waitForSelector("#TapeStudio iframe", { timeout: 30_000 });
      await gallery.waitForTimeout(4000); // React from the CDN, then each card renders
      const app = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await app.goto("http://localhost:5174/dev/design-system");
      await app.waitForTimeout(1200);
      const composer = await browser.newPage({ viewport: { width: 1600, height: 900 } });

      const reference = (name: string) => gallery.locator(`#${name} iframe`).screenshot();

      for (const [name, title] of Object.entries(SECTIONS)) {
        const ours = await app
          .locator("section", { has: app.getByRole("heading", { name: title }) })
          .first()
          .screenshot();
        await sheet(composer, name, await reference(name), ours);
      }
      for (const [name, file] of Object.entries(SCREENS)) {
        const path = `${ROOT}/verification/${file}`;
        if (!existsSync(path))
          throw new Error(`${path} is missing: run the design-system spec first`);
        await sheet(composer, name, await reference(name), readFileSync(path));
      }
    } finally {
      server.close();
    }
  });
});
