// Shared settings and steps for the browser tests.
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, type Page } from "@playwright/test";

// The test app's own password and database. Made up for the tests only:
// the real password and data are never used here.
export const TEST_PASSWORD = "e2e test password";
export const TEST_SESSION_SECRET = "e2e-only-session-secret-0123456789abcdef";
export const TEST_DB_URL = `file:${join(tmpdir(), "50-state-tracker-e2e.sqlite")}`;

/** Log in through the login page, the way you would. */
export async function logIn(page: Page, next = "/") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
