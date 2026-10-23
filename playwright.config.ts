// Playwright runs the browser tests in tests/e2e against a real running app.
// It starts the app itself on port 3100, so it never clashes with `pnpm dev`.
import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { TEST_DB_URL } from "./tests/e2e/helpers";

// The Clerk keys: from .env.local on the computer, from GitHub's secrets on GitHub.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  // One test at a time: the tests share one app and one database.
  workers: 1,
  // Creates the Clerk test people once, before any test (see tests/e2e/global-setup.ts).
  globalSetup: "./tests/e2e/global-setup.ts",
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "iphone", use: { ...devices["iPhone 13"], browserName: "chromium" } },
  ],
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    // The test app gets its own database (the Clerk keys come from .env.local or GitHub).
    env: { DATABASE_URL: TEST_DB_URL },
    timeout: 120_000,
  },
});
