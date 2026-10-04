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

// NOTE: keep rollup pinned (see package.json overrides): 4.64.0 hangs `vite build`.
const { version } = JSON.parse(readFileSync("./package.json", "utf8")) as {
  version: string;
};

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [react(), tailwindcss(), preloadFonts()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
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
});
