// Slice 7: the years page — a column per year with its trips, new states and
// running total, and moving trips between years with the "Move to" menu or by
// dragging (with a mouse, and with a finger on the iPhone).
import { expect, test, type Locator, type Page } from "@playwright/test";
import { addTrip, addVisit } from "@/db/queries";
import { logIn, openTestDatabase, resetData, today } from "./helpers";
import { expectCentersLineUp } from "./layout-helpers";

const THIS_YEAR = Number(today().slice(0, 4));
const NEXT_YEAR = THIS_YEAR + 1;

/** Save a trip straight into the test database; returns its id. */
async function saveTrip(name: string, start: string, end: string, states: string[] = ["VT"]) {
  const db = await openTestDatabase();
  const id = await addTrip(db, { name, startDate: start, endDate: end, states, cities: [] });
  db.$client.close();
  return id;
}

const column = (page: Page, year: number) => page.getByRole("region", { name: String(year), exact: true });
const card = (page: Page, name: string) => page.getByRole("article", { name });
const moveMenu = (page: Page, name: string) => page.getByRole("combobox", { name: `Move ${name} to` });

/** Pick a year in a card's "Move to" menu and press Move. */
async function moveWithMenu(page: Page, name: string, year: number) {
  await moveMenu(page, name).click();
  await page.getByRole("option", { name: String(year), exact: true }).click();
  await card(page, name).getByRole("button", { name: "Move" }).click();
}

/** The middle of an element on the screen. */
async function middleOf(locator: Locator) {
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Drag with a finger: press on `from`, hold a moment (so it isn't a scroll),
 * slide to `to` and let go. Sends real touch events through Chrome's DevTools. */
async function touchDrag(page: Page, from: Locator, to: Locator) {
  const start = await middleOf(from);
  const end = await middleOf(to);
  const touch = await page.context().newCDPSession(page);
  const point = (x: number, y: number) => [{ x, y, id: 1 }];
  await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point(start.x, start.y) });
  await page.waitForTimeout(400);
  for (let step = 1; step <= 12; step++) {
    const x = start.x + ((end.x - start.x) * step) / 12;
    const y = start.y + ((end.y - start.y) * step) / 12;
    await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: point(x, y) });
    await page.waitForTimeout(30);
  }
  await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

test.beforeEach(async ({ page }) => {
  await resetData();
  await logIn(page);
});

test.describe("the years page", () => {
  test("has this year and the next two, in order", async ({ page }) => {
    await page.goto("/years");
    await expect(page).toHaveTitle("Years · 50 States Tracker");
    const titles = page.getByRole("region").getByRole("heading", { level: 2 });
    await expect(titles).toHaveText([String(THIS_YEAR), String(NEXT_YEAR), String(NEXT_YEAR + 1)]);
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Years" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("shows more years when trips are planned further ahead", async ({ page }) => {
    await saveTrip("Far away", `${THIS_YEAR + 4}-06-01`, `${THIS_YEAR + 4}-06-03`, ["HI"]);
    await page.goto("/years");
    await expect(page.getByRole("region").getByRole("heading", { level: 2 })).toHaveCount(5);
  });

  test("a trip card sits in its year, with dates, state links and Edit coming back here", async ({ page }) => {
    const id = await saveTrip("Four Corners", `${NEXT_YEAR}-03-01`, `${NEXT_YEAR}-03-03`, ["CO", "NM"]);
    await page.goto("/years");
    const trip = column(page, NEXT_YEAR).getByRole("article", { name: "Four Corners" });
    await expect(trip).toContainText(`${NEXT_YEAR}-03-01 to ${NEXT_YEAR}-03-03`);
    await expect(trip.getByRole("link", { name: "Colorado" })).toHaveAttribute("href", "/states/CO");
    await expect(trip.getByRole("link", { name: "Edit" })).toHaveAttribute("href", `/trips/${id}/edit?return_to=years`);
    await expect(column(page, THIS_YEAR).getByRole("article")).toHaveCount(0);
  });

  test("shows the new states and the running total for each year", async ({ page }) => {
    const db = await openTestDatabase();
    await addVisit(db, { state: "CO", visitDate: "2024-07-04", note: "", city: null });
    db.$client.close();
    await saveTrip("Four Corners", `${NEXT_YEAR}-03-01`, `${NEXT_YEAR}-03-03`, ["CO", "NM"]);
    await page.goto("/years");
    await expect(column(page, NEXT_YEAR)).toContainText(`By the end of ${NEXT_YEAR}: 2 of 50`);
    await expect(column(page, NEXT_YEAR)).toContainText("New states: New Mexico");
    await expect(column(page, THIS_YEAR)).toContainText(`By the end of ${THIS_YEAR}: 1 of 50`);
  });

  test("an empty year says so and offers to plan a trip in it", async ({ page }) => {
    await page.goto("/years");
    await expect(column(page, NEXT_YEAR)).toContainText("No trips planned this year.");
    await expect(column(page, NEXT_YEAR).getByRole("link", { name: `Plan a trip in ${NEXT_YEAR}` })).toHaveAttribute(
      "href",
      `/trips/new?year=${NEXT_YEAR}`,
    );
  });

  test("explains how to move trips", async ({ page }) => {
    await page.goto("/years");
    await expect(page.getByText("Drag a trip by its handle to another year, or use its “Move to” menu.")).toBeVisible();
  });

  test("deleting from here comes back here", async ({ page }) => {
    await saveTrip("Gone soon", `${NEXT_YEAR}-03-01`, `${NEXT_YEAR}-03-02`);
    await page.goto("/years");
    await card(page, "Gone soon").getByRole("button", { name: "Delete" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL("/years");
    await expect(card(page, "Gone soon")).toHaveCount(0);
  });
});

test.describe("the Move to menu", () => {
  test("offers the other years, not the trip's own", async ({ page }) => {
    await saveTrip("Fall colors", `${NEXT_YEAR}-10-02`, `${NEXT_YEAR}-10-04`);
    await page.goto("/years");
    await moveMenu(page, "Fall colors").click();
    await expect(page.getByRole("option")).toHaveText([String(THIS_YEAR), String(NEXT_YEAR + 1)]);
  });

  test("moves a trip, keeping its month, day and length, everywhere", async ({ page }) => {
    await saveTrip("Fall colors", `${NEXT_YEAR}-10-02`, `${NEXT_YEAR}-10-04`);
    await page.goto("/years");
    await moveWithMenu(page, "Fall colors", NEXT_YEAR + 1);
    await expect(column(page, NEXT_YEAR + 1).getByRole("article", { name: "Fall colors" })).toBeVisible();
    await expect(column(page, NEXT_YEAR).getByRole("article")).toHaveCount(0);
    await page.goto("/trips");
    await expect(page.getByRole("list", { name: "Trips" })).toContainText(`${NEXT_YEAR + 1}-10-02 to ${NEXT_YEAR + 1}-10-04`);
    await page.goto(`/map?year=${NEXT_YEAR + 1}`);
    await expect(page.locator('[data-state="VT"]')).toHaveAttribute("data-status", "planned");
  });

  test("moving into the past is refused and explained, and nothing changes", async ({ page }) => {
    await saveTrip("New Year's", `${NEXT_YEAR}-01-01`, `${NEXT_YEAR}-01-02`);
    await page.goto("/years");
    await moveWithMenu(page, "New Year's", THIS_YEAR);
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("A planned trip must start in the future.");
    await expect(column(page, NEXT_YEAR).getByRole("article", { name: "New Year's" })).toBeVisible();
  });

  test("the menu and the Move button sit on one line at the same height", async ({ page }) => {
    await saveTrip("Fall colors", `${NEXT_YEAR}-10-02`, `${NEXT_YEAR}-10-04`);
    await page.goto("/years");
    const menu = moveMenu(page, "Fall colors");
    const button = card(page, "Fall colors").getByRole("button", { name: "Move" });
    await expectCentersLineUp([menu, button]);
    expect((await menu.boundingBox())?.height).toBe((await button.boundingBox())?.height);
  });
});

test.describe("dragging", () => {
  test("with a mouse: dragging a card's handle to another year moves the trip", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "mouse");
    await saveTrip("Fall colors", `${NEXT_YEAR}-10-02`, `${NEXT_YEAR}-10-04`);
    await page.goto("/years");
    const handle = page.getByRole("button", { name: "Drag Fall colors to another year" });
    const start = await middleOf(handle);
    const end = await middleOf(column(page, NEXT_YEAR + 1));
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 10, start.y + 10, { steps: 3 });
    await page.mouse.move(end.x, end.y, { steps: 15 });
    await page.mouse.up();
    await expect(column(page, NEXT_YEAR + 1).getByRole("article", { name: "Fall colors" })).toBeVisible();
  });

  test("with a finger on the iPhone: holding the handle and sliding moves the trip", async ({ page }, info) => {
    test.skip(info.project.name !== "iphone", "touch");
    await saveTrip("Fall colors", `${NEXT_YEAR}-10-02`, `${NEXT_YEAR}-10-04`);
    // On the phone the columns are stacked. A tall screen keeps the target column
    // in view, because Chrome ignores touches below the bottom of the screen.
    await page.setViewportSize({ width: 390, height: 1800 });
    await page.goto("/years");
    await touchDrag(page, page.getByRole("button", { name: "Drag Fall colors to another year" }), column(page, NEXT_YEAR + 1));
    await expect(column(page, NEXT_YEAR + 1).getByRole("article", { name: "Fall colors" })).toBeVisible();
  });

  test("dropping on the trip's own year changes nothing", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "mouse");
    await saveTrip("Fall colors", `${NEXT_YEAR}-10-02`, `${NEXT_YEAR}-10-04`);
    await page.goto("/years");
    const handle = page.getByRole("button", { name: "Drag Fall colors to another year" });
    await handle.dragTo(column(page, NEXT_YEAR));
    await expect(column(page, NEXT_YEAR).getByRole("article", { name: "Fall colors" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  });
});

test.describe("layout", () => {
  test("on a phone, the years are stacked in one column", async ({ page }, info) => {
    test.skip(info.project.name !== "iphone", "phone");
    await page.goto("/years");
    const first = (await column(page, THIS_YEAR).boundingBox())!;
    const second = (await column(page, NEXT_YEAR).boundingBox())!;
    expect(Math.abs(first.x - second.x)).toBeLessThanOrEqual(1);
    expect(second.y).toBeGreaterThan(first.y + first.height - 1);
  });

  test("on an iPad, the years go two by two, without sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto("/years");
    const first = (await column(page, THIS_YEAR).boundingBox())!;
    const second = (await column(page, NEXT_YEAR).boundingBox())!;
    expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(820);
  });
});
