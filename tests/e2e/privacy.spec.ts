// Slice 24: a short privacy page (/privacy): what's stored, who can see it,
// where it lives, how to take it with you and how to delete it. It opens
// without signing in, and is linked from the landing page, the sign-up page
// and the account menu. Also: Clerk's account-deletion webhook is reachable
// signed out, and refuses an unsigned request.
import { expect, test } from "@playwright/test";
import { addVisit, loadVisits } from "@/db/queries";
import { logIn, openNavMenu, openTestDatabase, resetData, userId } from "./helpers";

const SECTIONS = ["What's stored", "Who can see it", "Where it lives", "Taking it with you", "Deleting it"];

test.describe("signed out", () => {
  test("the privacy page opens, with its five parts", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page).toHaveURL("/privacy");
    await expect(page).toHaveTitle("Privacy · 50 States Tracker");
    await expect(page.getByRole("heading", { name: "Privacy", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(SECTIONS);
    await expect(page.getByText("Delete account")).toBeVisible();
    // Slice 26c: it says what's used when someone signs in with Google (the
    // Account button shows their Google picture), without promising Google sign-in.
    await expect(page.getByText(/your Google account and its profile picture if you sign in with Google/)).toBeVisible();
  });

  test("the landing page links to it at the bottom", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: "Privacy" }).click();
    await expect(page).toHaveURL("/privacy");
  });

  test("the sign-up page links to it", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
  });

  test("it fits an iPhone (390px) without sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test("the account-deletion webhook is reachable, but an unsigned request is refused and changes nothing", async ({ request }) => {
    await resetData();
    const db = await openTestDatabase();
    await addVisit(db, userId(), { state: "CO", visitDate: "2024-07-04", note: "", city: null });
    const response = await request.post("/api/webhooks/clerk", {
      data: { type: "user.deleted", object: "event", data: { id: userId(), deleted: true } },
      maxRedirects: 0, // not sent to the sign-in page
    });
    expect(response.status()).toBe(400);
    expect(await loadVisits(db, userId())).toHaveLength(1);
    db.$client.close();
  });
});

test("signed in, the account menu links to the privacy page", async ({ page }) => {
  await logIn(page);
  await openNavMenu(page);
  await page.getByRole("menuitem", { name: "Privacy" }).click();
  await expect(page).toHaveURL("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy", level: 1 })).toBeVisible();
});
