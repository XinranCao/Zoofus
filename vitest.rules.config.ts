import { defineConfig } from "vitest/config";

// Security rules tests run in Node against the Firebase emulators:
//   npm run test:rules
export default defineConfig({
  test: {
    environment: "node",
    include: ["rules-tests/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
