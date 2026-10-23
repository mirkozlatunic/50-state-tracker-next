// Slice 13: signing in with an email code or Google (Clerk), and everyone
// seeing only their own visits and trips. Replaces the password tests.
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";
import { addVisit } from "@/db/queries";
import { logIn, openNavMenu, openTestDatabase, resetData, USER_A_EMAIL, USER_B_EMAIL, userId } from "./helpers";

test.beforeEach(resetData);

test.describe("signed out", () => {
  test("a page sends you to sign in, and remembers where you were going", async ({ page }) => {
    await page.goto("/map?year=2027");
    await expect(page).toHaveURL(/\/sign-in/);
    expect(decodeURIComponent(page.url())).toContain("/map?year=2027");
  });

  test("the sign-in page offers an email address and Google", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page).toHaveTitle("Sign in · 50 States Tracker");
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByRole("button", { name: /Google/ })).toBeVisible();
  });

  test("there's a sign-up page for new people", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page).toHaveTitle("Sign up · 50 States Tracker");
    await expect(page.getByLabel("Email address")).toBeVisible();
  });

  test("the old /login address (e.g. an old home-screen icon) goes to sign in", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

test("signing in with an email code, through the real form", async ({ page }) => {
  await setupClerkTestingToken({ page });
  await page.goto("/states");
  await page.getByLabel("Email address").fill(USER_A_EMAIL);
  // Wait until Clerk has "sent" the code before typing it (Clerk's own tests do the same).
  const codeSent = page.waitForResponse((response) => response.url().includes("prepare_first_factor") && response.ok());
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await codeSent;
  // +clerk_test addresses get no real email; their code is always 424242.
  await page.getByRole("textbox", { name: /verification code/i }).pressSequentially("424242");
  await expect(page).toHaveURL("/states", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "States", level: 1 })).toBeVisible();
});

test.describe("each person has their own tracker", () => {
  test("my visits count for me, not for someone else", async ({ page, browser }) => {
    const db = await openTestDatabase();
    await addVisit(db, userId("A"), { state: "CO", visitDate: "2024-07-04", note: "Red Rocks", city: null });
    db.$client.close();

    await logIn(page, "/states/CO");
    await expect(page.getByRole("banner").getByText("1 of 50")).toBeVisible();
    await expect(page.getByText("Red Rocks")).toBeVisible();

    const other = await (await browser.newContext()).newPage();
    await logIn(other, "/states/CO", USER_B_EMAIL);
    await expect(other.getByRole("banner").getByText("0 of 50")).toBeVisible();
    await expect(other.getByText("No visits yet.")).toBeVisible();
  });

  test("someone else opening my visit's edit page finds nothing", async ({ page }) => {
    const db = await openTestDatabase();
    const id = await addVisit(db, userId("A"), { state: "CO", visitDate: "2024-07-04", note: "Red Rocks", city: null });
    db.$client.close();
    await logIn(page, "/", USER_B_EMAIL);
    await page.goto(`/visits/${id}/edit`);
    // The same "Not found" as a visit that doesn't exist (see visits.spec.ts).
    await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
    await expect(page.getByText("Red Rocks")).toHaveCount(0);
  });

  test("a visit I add is saved as mine", async ({ page }) => {
    await logIn(page, "/visits/new?state=VT");
    await page.getByLabel("Visit date").fill("2024-07-04");
    await page.getByLabel("Note").fill("Maple syrup");
    await page.getByRole("button", { name: "Save visit" }).click();
    await expect(page).toHaveURL("/states/VT");
    const db = await openTestDatabase();
    const rows = await db.$client.execute("SELECT user_id FROM visits WHERE note = 'Maple syrup'");
    db.$client.close();
    expect(rows.rows.map((row) => row.user_id)).toEqual([userId("A")]);
  });
});

test.describe("the account menu", () => {
  test("Manage account opens Clerk's account settings", async ({ page }) => {
    await logIn(page, "/states");
    await openNavMenu(page);
    await page.getByRole("menuitem", { name: "Manage account" }).click();
    await expect(page.getByRole("dialog")).toContainText(USER_A_EMAIL);
  });

  test("logging out signs this device out", async ({ page }) => {
    await logIn(page, "/states");
    await openNavMenu(page);
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/sign-in/);
    await page.goto("/states");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
