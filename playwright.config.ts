// Playwright runs the browser tests in tests/e2e against a real running app.
// It starts the app itself on port 3100, so it never clashes with `pnpm dev`.
// With E2E_BUILT=1 (used on GitHub) it runs the built app (`next start`, after
// `pnpm build`) instead of the development server: much faster, and it's what
// runs online.
import { defineConfig, devices } from "@playwright/test";
import { hashPasswordSync } from "./src/lib/auth/password";
import { TEST_DB_URL, TEST_PASSWORD, TEST_SESSION_SECRET } from "./tests/e2e/helpers";

const PORT = 3100;
const BUILT = process.env.E2E_BUILT === "1";

export default defineConfig({
  testDir: "tests/e2e",
  // One test at a time: the tests share one app and one database, and the
  // "5 wrong passwords" test would otherwise pause other tests' logins.
  workers: 1,
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
    // The test app gets its own password, session secret and database.
    env: {
      PASSWORD_HASH: hashPasswordSync(TEST_PASSWORD),
      SESSION_SECRET: TEST_SESSION_SECRET,
      DATABASE_URL: TEST_DB_URL,
    },
    timeout: 120_000,
  },
});
