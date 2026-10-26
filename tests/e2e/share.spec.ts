// Slice 20: a shareable progress map. Off until I turn it on (on /sharing);
// then /share/<code> shows anyone with the link which states I've visited, and
// nothing else. A new link replaces the old one; "Stop sharing" ends it.
// Slice 27: the shared page never shows photos, dates or cities, not even
// hidden in the page's HTML.
import { expect, test, type Browser, type Page } from "@playwright/test";
import { addTrip, addVisit } from "@/db/queries";
import { daysFromToday, logIn, openNavMenu, openTestDatabase, resetData, seedPhoto, USER_B_EMAIL, userId } from "./helpers";

/** Three visited states (with notes and a city) and an upcoming trip, for test person A. */
async function seed() {
  const db = await openTestDatabase();
  await addVisit(db, userId(), { state: "CA", visitDate: "2024-07-04", note: "Secret note", city: "San Francisco" });
  await addVisit(db, userId(), { state: "CO", visitDate: "2024-08-01", note: "", city: null });
  await addVisit(db, userId(), { state: "TX", visitDate: "2024-09-01", note: "", city: null });
  await addTrip(db, userId(), { name: "Secret trip", startDate: daysFromToday(7), endDate: daysFromToday(9), states: ["UT"], cities: [] });
  db.$client.close();
}

/** Turn sharing on at /sharing; returns the share link's address (e.g. "/share/abc..."). */
async function shareMap(page: Page) {
  await page.goto("/sharing");
  await page.getByRole("button", { name: "Share my map" }).click();
  const link = page.getByRole("textbox", { name: "Share link" });
  await expect(link).toHaveValue(/\/share\/[A-Za-z0-9_-]{22}$/);
  return new URL(await link.inputValue()).pathname;
}

/** A fresh, signed-out browser window (someone who got the link). */
const stranger = async (browser: Browser) => (await browser.newContext()).newPage();

test.beforeEach(async ({ page }) => {
  await resetData();
  await logIn(page);
});

test.describe("my share settings (/sharing)", () => {
  test("the menu leads there", async ({ page }) => {
    await page.goto("/states");
    await openNavMenu(page);
    await page.getByRole("menuitem", { name: "Share my map" }).click();
    await expect(page).toHaveURL("/sharing");
    await expect(page).toHaveTitle("Share · 50 States Tracker");
  });

  test("sharing is off at first, and the page says what a link would show", async ({ page }) => {
    await page.goto("/sharing");
    await expect(page.getByText("Your map isn't shared.")).toBeVisible();
    await expect(page.getByText(/only which states you've visited/)).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Share link" })).toHaveCount(0);
  });

  test("turning it on shows the link, and Copy link copies it", async ({ page, context }) => {
    // A real browser lets a page copy after a click; the test browser needs the permission up front.
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const path = await shareMap(page);
    await expect(page.getByText("Your map is shared.")).toBeVisible();
    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(new RegExp(`${path}$`));
  });

  test("if the browser won't let the page copy, the link is selected to copy by hand", async ({ page }) => {
    await shareMap(page);
    // As if copying were refused (some browsers, or a missing permission).
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("refused")) } });
    });
    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(page.getByText(/Press (Ctrl|⌘)\+C to copy/)).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Share link" })).toBeFocused();
  });

  test("my link stays the same when I come back", async ({ page }) => {
    const path = await shareMap(page);
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Share link" })).toHaveValue(new RegExp(`${path}$`));
  });

  test("someone else's share settings are their own", async ({ page, browser }) => {
    await shareMap(page);
    const other = await (await browser.newContext()).newPage();
    await logIn(other, "/sharing", USER_B_EMAIL);
    await expect(other.getByText("Your map isn't shared.")).toBeVisible();
  });
});

test.describe("the shared page (/share/<code>)", () => {
  test("someone with the link sees my visited states and the count, without signing in", async ({ page, browser }) => {
    await seed();
    const path = await shareMap(page);
    const visitor = await stranger(browser);
    await visitor.goto(path);
    await expect(visitor).toHaveURL(path); // not sent to sign in
    await expect(visitor.getByRole("heading", { level: 1 })).toHaveText("3 of 50 states visited");
    const map = visitor.getByRole("figure", { name: "Map of the 50 states" });
    await expect(map.locator('[data-state="CA"]')).toHaveAttribute("data-status", "visited");
    await expect(map.locator('[data-state="TX"]')).toHaveAttribute("data-status", "visited");
    await expect(visitor.getByRole("img", { name: "50 States Tracker" })).toBeVisible();
  });

  test("…and nothing else: no trips, dates, notes, cities, links into the app or header", async ({ page, browser }) => {
    await seed();
    const path = await shareMap(page);
    const visitor = await stranger(browser);
    await visitor.goto(path);
    const map = visitor.getByRole("figure", { name: "Map of the 50 states" });
    await expect(map.locator('[data-state="UT"]')).toHaveAttribute("data-status", "unvisited"); // the trip isn't shown
    await expect(map.locator("[data-stripes]")).toHaveCount(0);
    await expect(map.getByRole("link")).toHaveCount(0); // state pages are private
    await expect(map.locator("[data-kind]")).toHaveCount(0); // no city dots
    for (const secret of ["Secret note", "San Francisco", "Secret trip", "2024-07-04"]) {
      await expect(visitor.getByText(secret)).toHaveCount(0);
    }
    await expect(visitor.getByRole("navigation", { name: "Main" })).toHaveCount(0);
  });

  test("its HTML holds no photo address, city or visit date, even when my city visits have photos", async ({ page, browser }) => {
    await seed();
    const db = await openTestDatabase();
    const denver = await addVisit(db, userId(), { state: "CO", visitDate: "2024-08-02", note: "", city: "Denver" });
    await seedPhoto(db, denver, 1);
    db.$client.close();
    const path = await shareMap(page);
    // The page as it's sent, read by someone who isn't signed in. This also
    // covers React's page data, which comes inside the same HTML.
    const response = await (await stranger(browser)).request.get(path);
    expect(response.status()).toBe(200);
    const html = await response.text();
    // It really is the shared map (React puts "<!-- -->" between a number and the words next to it).
    expect(html).toMatch(/3(<!-- -->)? of 50 states visited/); // CA, CO and TX
    for (const secret of ["/photos/", "San Francisco", "Denver", "2024-07-04", "2024-08-02"]) {
      expect(html, secret).not.toContain(secret);
    }
  });

  test("search engines are asked not to list it, and link previews get a picture of the map", async ({ page, browser }) => {
    await seed();
    const path = await shareMap(page);
    const visitor = await stranger(browser);
    await visitor.goto(path);
    await expect(visitor.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    const image = await visitor.locator('meta[property="og:image"]').getAttribute("content");
    expect(image).toBeTruthy();
    const response = await visitor.request.get(new URL(image!).pathname);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
  });

  test("a new link replaces the old one, which stops working at once", async ({ page, browser }) => {
    const old = await shareMap(page);
    await page.getByRole("button", { name: "Make a new link" }).click();
    const link = page.getByRole("textbox", { name: "Share link" });
    await expect(link).not.toHaveValue(new RegExp(`${old}$`));
    const fresh = new URL(await link.inputValue()).pathname;
    const visitor = await stranger(browser);
    await visitor.goto(old);
    await expect(visitor.getByRole("heading", { name: "Not found" })).toBeVisible();
    await visitor.goto(fresh);
    await expect(visitor.getByRole("heading", { level: 1 })).toHaveText("0 of 50 states visited");
  });

  test("Stop sharing ends the link", async ({ page, browser }) => {
    const path = await shareMap(page);
    await page.getByRole("button", { name: "Stop sharing" }).click();
    await expect(page.getByText("Your map isn't shared.")).toBeVisible();
    const visitor = await stranger(browser);
    await visitor.goto(path);
    await expect(visitor.getByRole("heading", { name: "Not found" })).toBeVisible();
  });

  test("a made-up link is not found", async ({ browser }) => {
    const visitor = await stranger(browser);
    await visitor.goto(`/share/${"x".repeat(22)}`);
    await expect(visitor.getByRole("heading", { name: "Not found" })).toBeVisible();
  });

  test("fits an iPhone (390px) without sideways scrolling", async ({ page, browser }) => {
    await seed();
    const path = await shareMap(page);
    const visitor = await stranger(browser);
    await visitor.setViewportSize({ width: 390, height: 844 });
    await visitor.goto(path);
    await expect(visitor.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await visitor.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
