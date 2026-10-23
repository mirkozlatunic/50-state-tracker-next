// Playwright runs the browser tests in tests/e2e against a real running app.
// It starts the app itself on port 3100, so it never clashes with `pnpm dev`.
// With E2E_BUILT=1 (used on GitHub) it runs the built app (`next start`, after
// `pnpm build`) instead of the development server: much faster, and it's what
// runs online.
import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { TEST_DB_URL } from "./tests/e2e/helpers";

// The Clerk keys: from .env.local on the computer, from GitHub's secrets on GitHub.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const PORT = 3100;
const BUILT = process.env.E2E_BUILT === "1";

export default defineConfig({
  testDir: "tests/e2e",
  // One test at a time: the tests share one app and one database.
  workers: 1,
  // Creates the Clerk test people once, before any test (see tests/e2e/global-setup.ts).
  globalSetup: "./tests/e2e/global-setup.ts",
  // Each test resets its own data, so the tests may run in any order. That
  // lets GitHub split them evenly by test (not by file) over its 3 machines.
  fullyParallel: true,
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "iphone", use: { ...devices["iPhone 13"], browserName: "chromium" } },
  ],
  webServer: {
    command: BUILT ? `pnpm exec next start --port ${PORT}` : `pnpm exec next dev --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    // The test app gets its own database (the Clerk keys come from .env.local or GitHub).
    env: { DATABASE_URL: TEST_DB_URL },
    timeout: 120_000,
  },
});
