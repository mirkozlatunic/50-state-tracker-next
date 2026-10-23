// Slice 6: the map page — state colors, city dots with their details, the
// year filter, and on phones the next trip and the four region cards
// (the same checks as the Flask app's map, city dot and region tests).
import { expect, test, type Page } from "@playwright/test";
import { addTrip, addVisit } from "@/db/queries";
import { daysFromToday, logIn, openTestDatabase, resetData, today, userId } from "./helpers";
import { expectAtLeastTall } from "./layout-helpers";

const THIS_YEAR = Number(today().slice(0, 4));
const NEXT_YEAR = THIS_YEAR + 1;

/** Add visits and trips straight into the test database. */
async function seed({
  visits = [],
  trips = [],
}: {
  visits?: { state: string; date?: string; city?: string }[];
  trips?: { name: string; start: string; end: string; states: string[]; cities?: [string, string][] }[];
}) {
  const db = await openTestDatabase();
  for (const visit of visits) {
    await addVisit(db, userId(), { state: visit.state, visitDate: visit.date ?? "2024-07-04", note: "", city: visit.city ?? null });
  }
  for (const trip of trips) {
    await addTrip(db, userId(), {
      name: trip.name,
      startDate: trip.start,
      endDate: trip.end,
      states: trip.states,
      cities: (trip.cities ?? []).map(([name, state]) => ({ name, state })),
    });
  }
  db.$client.close();
}

// A "figure" (not an "img"): links inside an image are hidden from screen readers.
const map = (page: Page) => page.getByRole("figure", { name: "Map of the 50 states" });
const stateShape = (page: Page, code: string) => page.locator(`[data-state="${code}"]`);
const dotButton = (page: Page, label: string) => page.getByRole("button", { name: label, exact: true });
const regionCard = (page: Page, name: string) => page.getByRole("region", { name, exact: true });

test.beforeEach(async ({ page }) => {
  await resetData();
  await logIn(page);
});

test.describe("on a computer: the map", () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "the map is for bigger screens"));

  test("draws the 50 states, each linking to its page, with the map as the current nav page", async ({ page }) => {
    await page.goto("/map");
    await expect(page).toHaveTitle("Map · 50 States Tracker");
    await expect(map(page)).toBeVisible();
    await expect(page.locator("[data-state]")).toHaveCount(50);
    await expect(map(page).getByRole("link", { name: "California" })).toHaveAttribute("href", "/states/CA");
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Map" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("colors: green visited, orange in a trip that hasn't ended, grey otherwise; visited wins", async ({ page }) => {
    await seed({
      visits: [{ state: "CA" }, { state: "AZ" }],
      trips: [
        { name: "Weekend", start: daysFromToday(7), end: daysFromToday(9), states: ["AZ", "UT"] },
        { name: "Now", start: daysFromToday(-1), end: daysFromToday(1), states: ["TX"] },
        { name: "Ended", start: "2025-06-01", end: "2025-06-03", states: ["OR"] },
      ],
    });
    await page.goto("/map");
    const status = (code: string) => stateShape(page, code).getAttribute("data-status");
    expect(await status("CA")).toBe("visited");
    expect(await status("AZ")).toBe("visited");
    expect(await status("UT")).toBe("planned");
    expect(await status("TX")).toBe("planned");
    expect(await status("OR")).toBe("unvisited");
    const fill = (code: string) => stateShape(page, code).evaluate((shape) => getComputedStyle(shape).fill);
    expect(new Set([await fill("CA"), await fill("UT"), await fill("OR")]).size).toBe(3);
  });

  test("the year filter counts only trips that start in that year", async ({ page }) => {
    await seed({
      trips: [
        { name: "Soon", start: daysFromToday(0), end: daysFromToday(0), states: ["AZ"] },
        { name: "Next year", start: `${NEXT_YEAR}-03-01`, end: `${NEXT_YEAR}-03-03`, states: ["UT"] },
      ],
    });
    await page.goto("/map");
    const filter = page.getByRole("navigation", { name: "Planned trips" });
    await expect(filter.getByRole("link")).toHaveText(["All upcoming trips", String(THIS_YEAR), String(NEXT_YEAR)]);
    await expect(filter.getByRole("link", { name: "All upcoming trips" })).toHaveAttribute("aria-current", "page");
    await filter.getByRole("link", { name: String(NEXT_YEAR) }).click();
    await expect(page).toHaveURL(`/map?year=${NEXT_YEAR}`);
    await expect(stateShape(page, "UT")).toHaveAttribute("data-status", "planned");
    await expect(stateShape(page, "AZ")).toHaveAttribute("data-status", "unvisited");
    await expect(page.getByText(`Planned in ${NEXT_YEAR}`)).toBeVisible();
  });

  test("hovering a state shows its name", async ({ page }) => {
    await page.goto("/map");
    await expect(stateShape(page, "CO").locator("title")).toHaveText("Colorado");
  });

  test("a bad year in the address is ignored", async ({ page }) => {
    await seed({ trips: [{ name: "Weekend", start: daysFromToday(7), end: daysFromToday(9), states: ["UT"] }] });
    await page.goto("/map?year=banana");
    await expect(stateShape(page, "UT")).toHaveAttribute("data-status", "planned");
  });

  test("has a legend for the colors and the dots", async ({ page }) => {
    await page.goto("/map");
    const legend = page.getByRole("list", { name: "Legend" });
    for (const entry of ["Visited", "Planned", "Not visited yet", "Visited city", "Upcoming city"]) {
      await expect(legend.getByText(entry, { exact: true })).toBeVisible();
    }
  });
});

test.describe("on a computer: city dots", () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "the map is for bigger screens"));

  test("visits without a city give no dots", async ({ page }) => {
    await seed({ visits: [{ state: "CO" }] });
    await page.goto("/map");
    await expect(page.locator("[data-kind]")).toHaveCount(0);
  });

  test("a visited city is dark green, a city in an upcoming trip is blue, and one that's both is blue", async ({ page }) => {
    await seed({
      visits: [{ state: "CO", city: "Denver" }, { state: "CO", city: "Boulder" }],
      trips: [{ name: "Four Corners weekend", start: daysFromToday(7), end: daysFromToday(9), states: ["CO", "NM"], cities: [["Denver", "CO"], ["Santa Fe", "NM"]] }],
    });
    await page.goto("/map");
    await expect(dotButton(page, "Boulder, CO")).toHaveAttribute("data-kind", "visited");
    await expect(dotButton(page, "Santa Fe, NM")).toHaveAttribute("data-kind", "upcoming");
    await expect(dotButton(page, "Denver, CO")).toHaveAttribute("data-kind", "upcoming");
  });

  test("two visits to a city give one dot; a trip that ended gives none", async ({ page }) => {
    await seed({
      visits: [{ state: "CO", city: "Denver", date: "2024-07-04" }, { state: "CO", city: "Denver", date: "2025-03-01" }],
      trips: [{ name: "Ended", start: "2025-06-01", end: "2025-06-03", states: ["OR"], cities: [["Portland", "OR"]] }],
    });
    await page.goto("/map");
    await expect(page.locator("[data-kind]")).toHaveCount(1);
  });

  test("a dot sits on its city, on top of the map", async ({ page }) => {
    await seed({ visits: [{ state: "CO", city: "Denver" }] });
    await page.goto("/map");
    const dot = (await dotButton(page, "Denver, CO").boundingBox())!;
    const colorado = (await stateShape(page, "CO").boundingBox())!;
    const [x, y] = [dot.x + dot.width / 2, dot.y + dot.height / 2];
    expect(x > colorado.x && x < colorado.x + colorado.width && y > colorado.y && y < colorado.y + colorado.height).toBe(true);
    // What's drawn at the dot's middle is the dot itself.
    const topmost = await page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.closest("[data-kind]")?.getAttribute("aria-label"), [x, y]);
    expect(topmost).toBe("Denver, CO");
  });

  test("clicking a dot shows its visits and trips, with a link to its state", async ({ page }) => {
    await seed({
      visits: [{ state: "CO", city: "Denver", date: "2024-07-04" }],
      trips: [{ name: "Four Corners weekend", start: daysFromToday(7), end: daysFromToday(9), states: ["CO"], cities: [["Denver", "CO"]] }],
    });
    await page.goto("/map");
    await dotButton(page, "Denver, CO").click();
    const details = page.getByRole("dialog");
    await expect(details).toContainText("visited 2024-07-04");
    await expect(details).toContainText(`upcoming: Four Corners weekend (${daysFromToday(7)})`);
    await expect(details.getByRole("link", { name: "Open Colorado →" })).toHaveAttribute("href", "/states/CO");
  });

  test("hovering a dot shows its details too", async ({ page }) => {
    await seed({ visits: [{ state: "CO", city: "Denver", date: "2024-07-04" }] });
    await page.goto("/map");
    await dotButton(page, "Denver, CO").hover();
    await expect(page.getByRole("dialog")).toContainText("visited 2024-07-04");
  });

  test("the year filter hides other years' upcoming dots, but keeps visited ones", async ({ page }) => {
    await seed({
      visits: [{ state: "CO", city: "Denver" }],
      trips: [{ name: "Spring", start: `${NEXT_YEAR}-04-02`, end: `${NEXT_YEAR}-04-05`, states: ["CO", "NM"], cities: [["Denver", "CO"], ["Santa Fe", "NM"]] }],
    });
    await page.goto(`/map?year=${THIS_YEAR}`);
    await expect(dotButton(page, "Santa Fe, NM")).toHaveCount(0);
    await expect(dotButton(page, "Denver, CO")).toHaveAttribute("data-kind", "visited");
    await page.goto(`/map?year=${NEXT_YEAR}`);
    await expect(dotButton(page, "Denver, CO")).toHaveAttribute("data-kind", "upcoming");
  });

  test("dots stand out in dark mode too", async ({ browser }) => {
    const page = await (await browser.newContext({ colorScheme: "dark" })).newPage();
    await logIn(page);
    await seed({ visits: [{ state: "CO", city: "Denver" }] });
    await page.goto("/map");
    const colors = await dotButton(page, "Denver, CO").evaluate((dot) => {
      const style = getComputedStyle(dot);
      return [style.backgroundColor, getComputedStyle(document.body).backgroundColor];
    });
    expect(colors[0]).not.toBe(colors[1]);
  });
});

test.describe("on a phone: the next trip and the region cards", () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== "iphone", "the cards are for phones"));

  test("shows the cards instead of the map", async ({ page }) => {
    await page.goto("/map");
    await expect(regionCard(page, "West")).toBeVisible();
    await expect(map(page)).toBeHidden();
  });

  test("four Census regions in order, each with its count and bar", async ({ page }) => {
    await seed({ visits: [{ state: "CA" }], trips: [{ name: "Weekend", start: daysFromToday(7), end: daysFromToday(9), states: ["OR"] }] });
    await page.goto("/map");
    const titles = page.getByRole("region").getByRole("heading", { level: 2 });
    await expect(titles).toHaveText(["Northeast", "Midwest", "South", "West"]);
    await expect(regionCard(page, "West")).toContainText("1 of 13");
    await expect(regionCard(page, "South")).toContainText("0 of 16");
  });

  test("every state has a colored chip linking to its page, with its number of visited cities", async ({ page }) => {
    await seed({
      visits: [{ state: "CO", city: "Denver" }, { state: "CO", city: "Boulder" }],
      trips: [{ name: "Weekend", start: daysFromToday(7), end: daysFromToday(9), states: ["OR"] }],
    });
    await page.goto("/map");
    await expect(page.getByRole("region").locator("a[data-status]")).toHaveCount(50);
    const colorado = regionCard(page, "West").getByRole("link", { name: /^Colorado/ });
    await expect(colorado).toHaveAttribute("href", "/states/CO");
    await expect(colorado).toHaveAttribute("data-status", "visited");
    await expect(colorado).toContainText("2");
    await expect(regionCard(page, "West").getByRole("link", { name: /^Oregon/ })).toHaveAttribute("data-status", "planned");
  });

  test("the chips are big enough to tap", async ({ page }) => {
    await page.goto("/map");
    await expectAtLeastTall(await regionCard(page, "Northeast").getByRole("link").all(), 44);
  });

  test("the next trip card shows the soonest trip and how far away it is", async ({ page }) => {
    await seed({
      trips: [
        { name: "Later", start: daysFromToday(30), end: daysFromToday(31), states: ["OR"] },
        { name: "Sooner", start: daysFromToday(10), end: daysFromToday(12), states: ["TX"], cities: [["Austin", "TX"]] },
      ],
    });
    await page.goto("/map");
    const card = regionCard(page, "Next trip");
    await expect(card).toContainText("in 10 days");
    await expect(card.getByRole("link", { name: "Sooner" })).toHaveAttribute("href", "/trips");
    await expect(card).toContainText("Texas");
    await expect(card).toContainText("Austin");
  });

  test("says “tomorrow” and “happening now”", async ({ page }) => {
    await seed({ trips: [{ name: "Tomorrow", start: daysFromToday(1), end: daysFromToday(2), states: ["TX"] }] });
    await page.goto("/map");
    await expect(regionCard(page, "Next trip")).toContainText("tomorrow");
    await seed({ trips: [{ name: "Now", start: daysFromToday(-1), end: daysFromToday(1), states: ["OR"] }] });
    await page.goto("/map");
    await expect(regionCard(page, "Next trip")).toContainText("happening now");
  });

  test("without trips, the card offers to plan one", async ({ page }) => {
    await page.goto("/map");
    const card = regionCard(page, "Next trip");
    await expect(card).toContainText("No trips planned yet.");
    await expect(card.getByRole("link", { name: "Plan a trip" })).toHaveAttribute("href", "/trips/new");
  });

  test("the year filter works on the cards too", async ({ page }) => {
    await seed({ trips: [{ name: "Next year", start: `${NEXT_YEAR}-04-02`, end: `${NEXT_YEAR}-04-05`, states: ["OR"] }] });
    await page.goto(`/map?year=${THIS_YEAR}`);
    await expect(regionCard(page, "West").getByRole("link", { name: /^Oregon/ })).toHaveAttribute("data-status", "unvisited");
    await page.getByRole("navigation", { name: "Planned trips" }).getByRole("link", { name: String(NEXT_YEAR) }).click();
    await expect(regionCard(page, "West").getByRole("link", { name: /^Oregon/ })).toHaveAttribute("data-status", "planned");
  });
});

for (const [device, width] of [["iPhone", 390], ["iPad", 820]] as const) {
  test(`the map page fits an ${device} (${width}px) without sideways scrolling`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/map");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}
