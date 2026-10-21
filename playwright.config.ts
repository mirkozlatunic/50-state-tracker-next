// Playwright runs the browser tests in tests/e2e against a real running app.
// It starts the app itself on port 3100, so it never clashes with `pnpm dev`.
import { defineConfig, devices } from "@playwright/test";
import { hashPasswordSync } from "./src/lib/auth/password";
import { TEST_DB_URL, TEST_PASSWORD, TEST_SESSION_SECRET } from "./tests/e2e/helpers";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  // One test at a time: the tests share one app and one database, and the
  // "5 wrong passwords" test would otherwise pause other tests' logins.
  workers: 1,
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "iphone", use: { ...devices["iPhone 13"], browserName: "chromium" } },
  ],
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    // The test app gets its own password, session secret and database.
    env: {
      PASSWORD_HASH: hashPasswordSync(TEST_PASSWORD),
      SESSION_SECRET: TEST_SESSION_SECRET,
      DATABASE_URL: TEST_DB_URL,
    },
    timeout: 120_000,
  },
});
