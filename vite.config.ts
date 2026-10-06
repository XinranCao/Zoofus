import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { configDefaults, defineConfig } from "vitest/config";

/**
 * Preloads the three Latin font files every page uses (Special Elite, Courier Prime regular and
 * bold), so text is set in them from the first paint instead of shifting when they swap in.
 */
function preloadFonts(): Plugin {
  return {
    name: "zoofus-preload-fonts",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        const files = Object.keys(ctx.bundle ?? {}).filter((f) =>
          /(special-elite|courier-prime)-latin-(400|700)-normal-[^/]*\.woff2$/.test(f),
        );
        const tags = files.map((f) => ({
          tag: "link",
          attrs: {
            rel: "preload",
            as: "font",
            type: "font/woff2",
            crossorigin: "",
            href: "/" + f,
          },
          injectTo: "head" as const,
        }));
        return { html, tags };
      },
    },
  };
}

/**
 * Every web font package lists a `.woff` fallback after its `.woff2`. Every browser Zoofus supports
 * reads woff2, so the fallbacks would only double the size of the build (about 30 MB of Chinese
 * fonts). They are dropped from the stylesheets before the build copies the files.
 */
function woff2Only(): Plugin {
  return {
    name: "zoofus-woff2-only",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith(".css") || !code.includes("format('woff')")) return null;
      return code.replace(/,\s*url\([^)]*\.woff\)\s*format\(['"]woff['"]\)/g, "");
    },
  };
}

// NOTE: keep rollup pinned (see package.json overrides): 4.64.0 hangs `vite build`.
const { version } = JSON.parse(readFileSync("./package.json", "utf8")) as {
  version: string;
};

/**
 * The hosting headers from firebase.json, as the e2e servers send them. The preview server of a
 * production build sends them exactly as hosting does (the CSP enforcing); the dev server needs
 * inline scripts and eval for hot reload, so it only sends the CSP as report-only.
 */
function hostingHeaders(reportOnly: boolean): Record<string, string> {
  const rules = JSON.parse(readFileSync("./firebase.json", "utf8")).hosting.headers as {
    source: string;
    headers: { key: string; value: string }[];
  }[];
  // the e2e build talks to the local emulators, which the production policy rightly does not name
  // (the app reaches them by the host name of its own address: "localhost", or "127.0.0.1" for the
  // second browser the friends and Together specs use)
  const hosts = ["localhost", "127.0.0.1"];
  const at = (port: number) => hosts.map((h) => `http://${h}:${port}`).join(" ");
  const emulators = [9099, 8080, 9199].map(at).join(" ");
  const forEmulators = (csp: string) =>
    csp
      .replace(/connect-src /, `connect-src ${emulators} `)
      .replace(/img-src /, `img-src ${at(9199)} `)
      .replace(/frame-src /, `frame-src ${at(9099)} `);
  return Object.fromEntries(
    (rules.find((r) => r.source === "**")?.headers ?? []).map((h) => [
      reportOnly && h.key === "Content-Security-Policy"
        ? "Content-Security-Policy-Report-Only"
        : h.key,
      h.key === "Content-Security-Policy" ? forEmulators(h.value) : h.value,
    ]),
  );
}

export default defineConfig(({ mode }) => ({
  // The interface starts in Chinese. The end-to-end build and the unit tests ask for English, which
  // is what their assertions read; whoever picks a language keeps it (it is remembered).
  define: {
    __APP_VERSION__: JSON.stringify(version),
    ...(mode === "emulator"
      ? { "import.meta.env.VITE_DEFAULT_LANG": JSON.stringify("en") }
      : {}),
  },
  plugins: [woff2Only(), react(), tailwindcss(), preloadFonts()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: { headers: mode === "emulator" ? hostingHeaders(true) : {} },
  preview: { headers: mode === "emulator" ? hostingHeaders(false) : {} },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: [
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
            "firebase/storage",
          ],
          radix: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-slider",
            "@radix-ui/react-toast",
            "@radix-ui/react-toggle-group",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-radio-group",
          ],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
    globals: true,
    env: { VITE_DEFAULT_LANG: "en" },
    // `npm run test:coverage`: fails if coverage falls below today's level (about 31%); raise the
    // numbers as it grows, never lower them to make a change pass
    coverage: {
      provider: "v8",
      thresholds: { statements: 30, branches: 27, functions: 20, lines: 30 },
      reporter: ["text-summary", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.*", "src/pages/dev/**", "src/setupTests.ts"],
    },
    // Security rules tests need the emulators: run them with `npm run test:rules`.
    exclude: [...configDefaults.exclude, "rules-tests/**", "e2e/**"],
  },
}));
