// Shared settings and steps for the browser tests.
import { tmpdir } from "node:os";
import { join } from "node:path";
import { clerk } from "@clerk/testing/playwright";
import { expect, type Page } from "@playwright/test";
import { openDatabase, setupDatabase } from "@/db";

// The test app's own database. Made up for the tests only: the real data is never used here.
export const TEST_DB_URL = `file:${join(tmpdir(), "50-state-tracker-e2e.sqlite")}`;
// The test app's photos go to a local folder, never the real (Vercel Blob) store.
export const TEST_PHOTO_DIR = join(tmpdir(), "50-state-tracker-e2e-photos");

// Two made-up Clerk test people. "+clerk_test" addresses never get real email;
// in Clerk's development app their sign-in code is always 424242.
// global-setup.ts makes sure both exist and saves their Clerk ids.
export const USER_A_EMAIL = "tracker-a+clerk_test@example.com";
export const USER_B_EMAIL = "tracker-b+clerk_test@example.com";

/** The Clerk id of test person A (the one most tests sign in as) or B. */
export function userId(person: "A" | "B" = "A"): string {
  const id = process.env[`E2E_USER_${person}_ID`];
  if (!id) throw new Error(`E2E_USER_${person}_ID isn't set: global-setup.ts didn't run`);
  return id;
}

/** Sign in as test person A (or another address) and open `next`.
 * clerk.signIn skips the email code (a testing shortcut); one test in
 * accounts.spec.ts signs in through the real form instead. */
export async function logIn(page: Page, next = "/", email = USER_A_EMAIL) {
  // Clerk needs a page that loads it first. "domcontentloaded": don't wait for
  // every last file (a slow one from Clerk's servers made tests time out);
  // clerk.signIn waits for Clerk to be ready itself.
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await clerk.signIn({ page, emailAddress: email });
  // Just after signing in, Clerk sometimes moves the browser to another page by
  // itself, which can cut off the page that's opening; then open it again.
  // ("/" itself forwards to /map, so this only checks it isn't /sign-in.)
  await expect(async () => {
    await page.goto(next);
    await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 2000 });
  }).toPass({ timeout: 20_000 });
}

/** Open `path` and make sure the browser stays on it (see logIn: Clerk's late
 * move can also cut off the page opened right after the first one). */
export async function goTo(page: Page, path: string) {
  await expect(async () => {
    await page.goto(path);
    await expect(page).toHaveURL((url) => url.pathname + url.search === path, { timeout: 2000 });
  }).toPass({ timeout: 20_000 });
}

/** Open the header's menu: "Account" on a computer, "Menu" on a phone (where it holds the pages too). */
export async function openNavMenu(page: Page) {
  await page.getByRole("banner").getByRole("button", { name: /^(Account|Menu)$/ }).click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  // It zooms in from 95%; wait until it's full size before anything measures it.
  await expect.poll(() => menu.evaluate((element) => element.getAnimations().length)).toBe(0);
}

/** The header marks `name` as the page you're on: in the nav on a computer, in the menu on a phone. */
export async function expectCurrentPage(page: Page, name: string) {
  const nav = page.getByRole("navigation", { name: "Main" });
  if (await nav.isVisible()) {
    await expect(nav.getByRole("link", { name })).toHaveAttribute("aria-current", "page");
  } else {
    await openNavMenu(page);
    await expect(page.getByRole("menuitem", { name })).toHaveAttribute("aria-current", "page");
    await page.keyboard.press("Escape");
  }
}

/** Open the test app's database (made up for the tests, never the real data). */
export async function openTestDatabase() {
  const db = openDatabase({ url: TEST_DB_URL });
  // The app reads this same file at the same time. When it's busy, wait up to
  // 5 seconds instead of failing straight away with "database is locked".
  await db.$client.execute("PRAGMA busy_timeout = 5000");
  await setupDatabase(db);
  return db;
}

/** Remove everyone's visits and trips, so each test starts from an empty tracker. */
export async function resetData() {
  const db = await openTestDatabase();
  await db.$client.batch(
    ["DELETE FROM user_settings", "DELETE FROM visit_photos", "DELETE FROM trip_cities", "DELETE FROM trip_states", "DELETE FROM trips", "DELETE FROM visits"],
    "write",
  );
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
