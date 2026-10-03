import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

// NOTE: keep rollup pinned (see package.json overrides): 4.64.0 hangs `vite build`.
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
            "firebase/analytics",
          ],
          mui: ["@mui/material", "@mui/icons-material"],
          konva: ["konva", "react-konva", "polygon-clipping"],
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
