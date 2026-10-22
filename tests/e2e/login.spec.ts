// Slice 2: one password for the whole app (the same checks as the Flask app's test_login.py).
import { expect, test } from "@playwright/test";
import { openDatabase, setupDatabase } from "@/db";
import { logIn, openNavMenu, TEST_DB_URL, TEST_PASSWORD } from "./helpers";

/** Forget all wrong passwords, so one test's tries don't pause the next test's login. */
async function forgetWrongTries() {
  const db = openDatabase({ url: TEST_DB_URL });
  await setupDatabase(db); // the app may not have made its tables yet
  await db.$client.execute("DELETE FROM login_failures");
  db.$client.close();
}

/** Type a password on the login page, press "Log in", and wait for the answer
 * (the form clears itself afterwards, so typing early would be lost). */
async function submitPassword(page: import("@playwright/test").Page, password: string) {
  await page.getByLabel("Password").fill(password);
  const answer = page.waitForResponse((response) => response.request().method() === "POST");
  await page.getByRole("button", { name: "Log in" }).click();
  await answer;
}

test.beforeEach(forgetWrongTries);
test.afterEach(forgetWrongTries);

test("logged out, a page sends you to the login page and remembers where you were going", async ({ page }) => {
  await page.goto("/map?year=2027");
  await expect(page).toHaveURL(`/login?next=${encodeURIComponent("/map?year=2027")}`);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("the login page uses shadcn parts and lets the iPhone offer a saved password", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveTitle("Log in · 50 States Tracker");
  const field = page.getByLabel("Password");
  await expect(field).toHaveAttribute("type", "password");
  await expect(field).toHaveAttribute("autocomplete", "current-password");
  await expect(page.getByRole("button", { name: "Log in" })).toHaveAttribute("data-slot", "button");
  await expect(page.getByText("You stay logged in on this device for 30 days.")).toBeVisible();
});

test("the right password logs you in and sends you back", async ({ page }) => {
  await page.goto("/login?next=%2Fstates");
  await submitPassword(page, TEST_PASSWORD);
  await expect(page).toHaveURL("/states");
});

test("without a page to go back to, you land on the home page", async ({ page }) => {
  await page.goto("/login");
  await submitPassword(page, TEST_PASSWORD);
  await expect(page).toHaveURL("/");
});

test("you can't be sent to another website after logging in", async ({ page }) => {
  await page.goto(`/login?next=${encodeURIComponent("https://example.com")}`);
  await submitPassword(page, TEST_PASSWORD);
  await expect(page).toHaveURL("/");
});

test("one login opens the whole app", async ({ page }) => {
  await logIn(page);
  for (const path of ["/", "/states", "/map?year=2027"]) {
    await page.goto(path);
    await expect(page).not.toHaveURL(/\/login/);
  }
});

test("a wrong password is refused", async ({ page }) => {
  await page.goto("/login");
  await submitPassword(page, "not it");
  await expect(page.locator("form").getByRole("alert")).toHaveText("That password isn't right.");
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("after 5 wrong passwords, even the right one waits a minute", async ({ page }) => {
  await page.goto("/login");
  for (let i = 0; i < 5; i++) await submitPassword(page, `wrong ${i}`);
  await submitPassword(page, TEST_PASSWORD);
  await expect(page.locator("form").getByRole("alert")).toHaveText("Too many wrong passwords. Try again in a minute.");
  await expect(page).toHaveURL(/\/login/);
});

test("the login cookie lasts 30 days, is hidden from scripts and stays on this site", async ({ page, context }) => {
  await logIn(page);
  const [cookie] = (await context.cookies()).filter((c) => c.name === "tracker_session");
  expect(cookie).toBeDefined();
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.sameSite).toBe("Lax");
  const days = (cookie.expires - Date.now() / 1000) / 86_400;
  expect(days).toBeGreaterThan(29.9);
  expect(days).toBeLessThan(30.1);
});

test("a made-up cookie doesn't log you in", async ({ page, context }) => {
  await context.addCookies([{ name: "tracker_session", value: "fake", url: "http://127.0.0.1:3100" }]);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("logging out", async ({ page }) => {
  await logIn(page);
  await openNavMenu(page);
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL("/login");
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});
