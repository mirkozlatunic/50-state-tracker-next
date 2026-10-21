// Shared settings and steps for the browser tests.
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, type Page } from "@playwright/test";
import { openDatabase, setupDatabase } from "@/db";

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

/** Open the test app's database (made up for the tests, never the real data). */
export async function openTestDatabase() {
  const db = openDatabase({ url: TEST_DB_URL });
  await setupDatabase(db);
  return db;
}

/** Remove all visits and trips, so each test starts from an empty tracker. */
export async function resetData() {
  const db = await openTestDatabase();
  await db.$client.batch(["DELETE FROM trip_cities", "DELETE FROM trip_states", "DELETE FROM trips", "DELETE FROM visits"], "write");
  db.$client.close();
}

/** Today's date in Los Angeles, the app's time zone, as "YYYY-MM-DD". */
export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
}

/** A date `days` away from today, as "YYYY-MM-DD". */
export function daysFromToday(days: number): string {
  const date = new Date(`${today()}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
