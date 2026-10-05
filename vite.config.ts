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

/** The hosting headers (firebase.json) as the emulated dev server sends them too, so the e2e run sees any CSP violation. */
function hostingHeaders(): Record<string, string> {
  const rules = JSON.parse(readFileSync("./firebase.json", "utf8")).hosting.headers as {
    source: string;
    headers: { key: string; value: string }[];
  }[];
  return Object.fromEntries(
    (rules.find((r) => r.source === "**")?.headers ?? [])
      .filter((h) => h.key === "Content-Security-Policy-Report-Only")
      .map((h) => [h.key, h.value]),
  );
}

export default defineConfig(({ mode }) => ({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [woff2Only(), react(), tailwindcss(), preloadFonts()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: { headers: mode === "emulator" ? hostingHeaders() : {} },
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
    // Security rules tests need the emulators: run them with `npm run test:rules`.
    exclude: [...configDefaults.exclude, "rules-tests/**", "e2e/**"],
  },
}));
