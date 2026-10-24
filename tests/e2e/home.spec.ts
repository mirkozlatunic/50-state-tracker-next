// Slice 16: the home page ("/"), laid out like the approved reference.
// Slice 21: "/" is now the public landing page. Signed out, it shows the
// heading, a "Start tracking" button (to sign in) and a sample dashboard with
// made-up data, so people can see what the app looks like. Signed in, "/"
// opens the map, which now carries your numbers and milestones.
import { expect, test, type Page } from "@playwright/test";
import { addVisit } from "@/db/queries";
import { logIn, openTestDatabase, resetData, USER_B_EMAIL, userId } from "./helpers";

/** Add visits for test person A straight into the test database. */
async function seed(states: string[]) {
  const db = await openTestDatabase();
  for (const state of states) await addVisit(db, userId(), { state, visitDate: "2024-07-04", note: "", city: null });
  db.$client.close();
}

const stats = (page: Page) => page.getByRole("list", { name: "Progress" });
const map = (page: Page) => page.getByRole("figure", { name: "Map of the 50 states" });

test.describe("signed out: the landing page", () => {
  test("opens at / without signing in, with the heading", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page).toHaveTitle("50 States Tracker");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("All 50 States. One Journey.");
    await expect(page.getByText("Explore · Visit · Complete")).toBeVisible();
  });

  test("shows a sample dashboard, clearly marked as sample data", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Sample data", { exact: true })).toBeVisible();
    await expect(stats(page).getByRole("listitem")).toHaveText(["50 States", "18 Visited", "32 Remaining"]);
    await expect(page.getByRole("list", { name: "Milestones" }).getByRole("listitem")).toHaveText([
      "10 states, reached",
      "25 states: 7 to go",
      "50 states",
    ]);
    await expect(page.getByRole("region", { name: "Next trip" })).toBeVisible();
  });

  test("the sample map shows visited and planned states, and city dots", async ({ page }) => {
    await page.goto("/");
    await expect(map(page)).toBeVisible();
    await expect(map(page).locator('[data-status="visited"]')).toHaveCount(18);
    await expect(map(page).locator('[data-status="planned"]')).toHaveCount(4);
    await expect(map(page).locator("[data-kind]").first()).toBeVisible();
  });

  test("the only ways in are signing in (no links into the private pages)", async ({ page }) => {
    await page.goto("/");
    const hrefs = await page.getByRole("link").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    for (const href of hrefs) expect(href).toMatch(/^\/(sign-in|sign-up)?$/);
  });

  test("Start tracking opens the sign-in page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Start tracking" }).click();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("has a light/dark switch and a Sign in button", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Switch between light and dark mode" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("href", "/sign-in");
  });

  test("on a phone, the heading, button, map and numbers stack top to bottom", async ({ page }, info) => {
    test.skip(info.project.name !== "iphone", "phone layout");
    await page.goto("/");
    const top = async (target: ReturnType<Page["getByRole"]>) => (await target.boundingBox())!.y;
    const heading = await top(page.getByRole("heading", { level: 1 }));
    const button = await top(page.getByRole("link", { name: "Start tracking" }));
    const mapTop = await top(map(page));
    const numbers = await top(stats(page));
    expect(heading).toBeLessThan(button);
    expect(button).toBeLessThan(mapTop);
    expect(mapTop).toBeLessThan(numbers);
  });

  test("on a computer, the heading sits beside the map", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "computer layout");
    await page.goto("/");
    const heading = (await page.getByRole("heading", { level: 1 }).boundingBox())!;
    const mapBox = (await map(page).boundingBox())!;
    expect(heading.x + heading.width).toBeLessThanOrEqual(mapBox.x + 1);
    expect(heading.y).toBeLessThan(mapBox.y + mapBox.height);
  });

  for (const [device, width] of [["iPhone", 390], ["iPad", 820]] as const) {
    test(`fits an ${device} (${width}px) without sideways scrolling`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    });
  }
});

test.describe("signed in", () => {
  test.beforeEach(async ({ page }) => {
    await resetData();
    await logIn(page);
  });

  test("/ opens the map", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/map");
    await expect(page.getByRole("heading", { name: "Map", level: 1 })).toBeVisible();
  });

  test("the map page shows my numbers: 50 states, 0 visited, 50 remaining when empty", async ({ page }) => {
    await page.goto("/map");
    await expect(stats(page).getByRole("listitem")).toHaveText(["50 States", "0 Visited", "50 Remaining"]);
  });

  test("after visits to 3 different states it shows 3 visited and 47 remaining", async ({ page }) => {
    await seed(["CA", "NV", "AZ", "CA"]); // two visits to California count once
    await page.goto("/map");
    await expect(stats(page).getByRole("listitem")).toHaveText(["50 States", "3 Visited", "47 Remaining"]);
  });

  test("someone else's map page shows their own numbers, not mine", async ({ browser }) => {
    await seed(["CA", "NV"]);
    const other = await (await browser.newContext()).newPage();
    await logIn(other, "/map", USER_B_EMAIL);
    await expect(stats(other).getByRole("listitem")).toHaveText(["50 States", "0 Visited", "50 Remaining"]);
  });

  test("the logo in the header leads to the map", async ({ page }) => {
    await page.goto("/states");
    await page.getByRole("banner").getByRole("link", { name: "50 States Tracker" }).click();
    await expect(page).toHaveURL("/map");
  });
});
