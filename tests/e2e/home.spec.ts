// Slice 16: the home page ("/"), laid out like the approved reference: a
// heading, a "Start tracking" button, your own map, and your own numbers
// (50 states, visited, remaining). It opens instead of jumping to /states.
import { expect, test, type Page } from "@playwright/test";
import { addTrip, addVisit } from "@/db/queries";
import { daysFromToday, logIn, openTestDatabase, resetData, USER_B_EMAIL, userId } from "./helpers";

/** Add visits (and optionally trips) for test person A straight into the test database. */
async function seed(states: string[], tripStates: string[] = []) {
  const db = await openTestDatabase();
  for (const state of states) await addVisit(db, userId(), { state, visitDate: "2024-07-04", note: "", city: null });
  if (tripStates.length) {
    await addTrip(db, userId(), { name: "Soon", startDate: daysFromToday(7), endDate: daysFromToday(9), states: tripStates, cities: [] });
  }
  db.$client.close();
}

const stats = (page: Page) => page.getByRole("list", { name: "Progress" });
const map = (page: Page) => page.getByRole("figure", { name: "Map of the 50 states" });

test.beforeEach(async ({ page }) => {
  await resetData();
  await logIn(page);
});

test("the home page opens at / (no jump to the states list) with the heading", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/");
  await expect(page).toHaveTitle("50 States Tracker");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("All 50 States. One Journey.");
  await expect(page.getByText("Explore · Visit · Complete")).toBeVisible();
});

test("an empty tracker shows 50 states, 0 visited, 50 remaining", async ({ page }) => {
  await page.goto("/");
  await expect(stats(page).getByRole("listitem")).toHaveText(["50 States", "0 Visited", "50 Remaining"]);
});

test("after visits to 3 different states it shows 3 visited and 47 remaining", async ({ page }) => {
  await seed(["CA", "NV", "AZ", "CA"]); // two visits to California count once
  await page.goto("/");
  await expect(stats(page).getByRole("listitem")).toHaveText(["50 States", "3 Visited", "47 Remaining"]);
});

test("the map shows my visited and planned states, with the same rules as the map page", async ({ page }) => {
  await seed(["CA"], ["UT"]);
  await page.goto("/");
  await expect(map(page)).toBeVisible();
  await expect(map(page).locator('[data-state="CA"]')).toHaveAttribute("data-status", "visited");
  await expect(map(page).locator('[data-state="UT"]')).toHaveAttribute("data-status", "planned");
  await expect(map(page).locator('[data-state="OR"]')).toHaveAttribute("data-status", "unvisited");
  await expect(map(page).getByRole("link", { name: "California" })).toHaveAttribute("href", "/states/CA");
});

test("someone else's home page shows their own numbers, not mine", async ({ browser }) => {
  await seed(["CA", "NV"]);
  const other = await (await browser.newContext()).newPage();
  await logIn(other, "/", USER_B_EMAIL);
  await expect(stats(other).getByRole("listitem")).toHaveText(["50 States", "0 Visited", "50 Remaining"]);
});

test("Start tracking opens the add-visit form", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Start tracking" }).click();
  await expect(page).toHaveURL("/visits/new");
});

test("the logo in the header leads home", async ({ page }) => {
  await page.goto("/states");
  await page.getByRole("banner").getByRole("link", { name: "50 States Tracker" }).click();
  await expect(page).toHaveURL("/");
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
