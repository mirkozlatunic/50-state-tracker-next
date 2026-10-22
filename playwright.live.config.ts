// Playwright settings for the live checks (tests/live): they visit the real,
// online site instead of starting the app here. Run with: pnpm test:live
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/live",
  workers: 1,
  projects: [{ name: "live", use: { ...devices["Desktop Chrome"] } }],
});
