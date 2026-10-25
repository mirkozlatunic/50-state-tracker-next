// Playwright settings for the README's screenshots (slice 25). Run with:
// pnpm screenshots   (after `pnpm build`, add E2E_BUILT=1 for the built app)
// It reuses the browser tests' set-up (playwright.config.ts): the same test
// app on port 3100, its own test database and the Clerk test people, so the
// pictures never show anyone's real data. They're saved in docs/screenshots/.
import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testDir: "tests/screenshots",
  fullyParallel: false,
  // Each picture sets its own screen size and theme.
  projects: [{ name: "screenshots", use: { ...devices["Desktop Chrome"] } }],
});
