import { defineConfig } from "@playwright/test";

// End-to-end tests run the real app against the local Firebase emulators:
//   npm run test:e2e
// Locally this uses your installed Google Chrome; in CI, Playwright's Chromium.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  // One worker (the tests share the emulators), but in CI the tests are split one by one across
  // several runners (PW_SHARD="2/6"), so each runner gets a fair share of the long ones.
  fullyParallel: Boolean(process.env.PW_SHARD),
  workers: 1,
  shard: process.env.PW_SHARD
    ? {
        current: Number(process.env.PW_SHARD.split("/")[0]),
        total: Number(process.env.PW_SHARD.split("/")[1]),
      }
    : undefined,
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
