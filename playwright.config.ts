import { defineConfig } from "@playwright/test";

// End-to-end tests run the real app against the local Firebase emulators:
//   npm run test:e2e
// Locally this uses your installed Google Chrome; in CI, Playwright's Chromium.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:5174",
    channel: process.env.CI ? undefined : "chrome",
    trace: "retain-on-failure",
  },
  // The CSP is judged on a production build served with the real hosting headers (the policy
  // enforcing); everything else runs on the dev server. The share, Together and Google flows run
  // in both (their `csp-guard` fixture fails on a violation in the "csp" project).
  projects: [
    { name: "app", testIgnore: /csp\.spec\.ts/ },
    {
      name: "csp",
      testMatch: /(csp|friends|together|google-signin)\.spec\.ts/,
      use: { baseURL: "http://localhost:4175" },
    },
  ],
  webServer: [
    {
      command: "npm run dev:emulated -- --port 5174 --strictPort",
      url: "http://localhost:5174",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: "npm run build:e2e && npm run preview:e2e",
      url: "http://localhost:4175",
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
