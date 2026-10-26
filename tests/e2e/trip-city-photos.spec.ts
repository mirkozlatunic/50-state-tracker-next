// Slice 28: on a planned trip, each city I've already visited shows its photo
// (small, if it has one) and "Visited <month year>" for my most recent visit
// there. Cities I haven't visited stay as they are. It shows on /trips, on the
// /years trip cards and, on phones, on the next-trip card on /map.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { addTrip, addVisit } from "@/db/queries";
import { daysFromToday, logIn, openTestDatabase, resetData, seedPhoto, USER_B_EMAIL, userId } from "./helpers";

const TRIP = "Colorado weekend";
const DENVER_ALT = "Photo from the visit to Denver, Colorado on 2024-07-04";

/** Person A: Denver visited with a photo (2024-07-04), and again later without
 * one (2025-03-01); Grand Junction visited without photos (2024-09-01); Boulder
 * not visited. A trip in 10 days to all three. Returns Denver's photo id. */
async function seed() {
  const db = await openTestDatabase();
  const add = (visitDate: string, city: string) => addVisit(db, userId(), { state: "CO", visitDate, note: "", city });
  const photo = await seedPhoto(db, await add("2024-07-04", "Denver"), 1);
  await add("2025-03-01", "Denver");
  await add("2024-09-01", "Grand Junction");
  await addTrip(db, userId(), {
    name: TRIP,
    startDate: daysFromToday(10),
    endDate: daysFromToday(12),
    states: ["CO"],
    cities: ["Denver", "Grand Junction", "Boulder"].map((name) => ({ name, state: "CO" })),
  });
  db.$client.close();
  return photo;
}

/** The visited-city row for `city` inside `trip`. */
const visitedRow = (trip: Locator, city: string) =>
  trip.getByRole("list", { name: "Cities I've visited" }).getByRole("listitem").filter({ hasText: city });

/** The three cases, the same wherever the trip is shown. */
async function expectVisitedCities(trip: Locator, photoId: number) {
  // Denver: the photo (from the visit that has one) and my most recent visit's month.
  const denver = visitedRow(trip, "Denver");
  await expect(denver).toContainText("Visited March 2025");
  const image = denver.getByRole("img", { name: DENVER_ALT });
  await expect(image).toHaveAttribute("src", `/photos/${photoId}?size=thumb`);
  await expect(image).toHaveAttribute("loading", "lazy");
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  // Grand Junction: visited, but no photo.
  const junction = visitedRow(trip, "Grand Junction");
  await expect(junction).toContainText("Visited September 2024");
  await expect(junction.getByRole("img")).toHaveCount(0);
  // Boulder: not visited, so it stays in the plain city line, with nothing extra.
  await expect(visitedRow(trip, "Boulder")).toHaveCount(0);
  await expect(trip).toContainText("Boulder");
  await expect(trip.getByRole("img")).toHaveCount(1);
}

const tripOnTrips = (page: Page) => page.getByRole("list", { name: "Trips" }).getByRole("listitem").filter({ hasText: TRIP }).first();

test.beforeEach(async ({ page }) => {
  await resetData();
  await logIn(page);
});

test("on /trips, a visited trip city shows its photo and when I was there; one I haven't visited shows nothing extra", async ({ page }) => {
  const photo = await seed();
  await page.goto("/trips");
  await expectVisitedCities(tripOnTrips(page), photo);
});

test("on /years, the trip card shows them the same way", async ({ page }) => {
  const photo = await seed();
  await page.goto("/years");
  await expectVisitedCities(page.getByRole("article", { name: TRIP }), photo);
});

test("on a phone, the next-trip card on /map shows them too", async ({ page }, info) => {
  test.skip(info.project.name !== "iphone", "the next-trip card is for phones");
  const photo = await seed();
  await page.goto("/map");
  await expectVisitedCities(page.getByRole("region", { name: "Next trip" }), photo);
});

test("a trip without visited cities looks as before", async ({ page }) => {
  const db = await openTestDatabase();
  await addTrip(db, userId(), { name: TRIP, startDate: daysFromToday(10), endDate: daysFromToday(12), states: ["CO"], cities: [{ name: "Boulder", state: "CO" }] });
  db.$client.close();
  await page.goto("/trips");
  await expect(tripOnTrips(page)).toContainText("Cities: Boulder, CO");
  await expect(tripOnTrips(page).getByRole("list", { name: "Cities I've visited" })).toHaveCount(0);
  await expect(tripOnTrips(page).getByRole("img")).toHaveCount(0);
});

test("only my own visits count: someone else's visit and photo never show on my trip", async ({ browser }) => {
  await seed(); // test person A has visited Denver, with a photo
  // Test person B plans a trip to Denver without having been there.
  const db = await openTestDatabase();
  await addTrip(db, userId("B"), { name: TRIP, startDate: daysFromToday(10), endDate: daysFromToday(12), states: ["CO"], cities: [{ name: "Denver", state: "CO" }] });
  db.$client.close();

  const other = await (await browser.newContext()).newPage();
  await logIn(other, "/trips", USER_B_EMAIL);
  await expect(tripOnTrips(other)).toContainText("Cities: Denver, CO");
  await expect(tripOnTrips(other)).not.toContainText("Visited");
  for (const path of ["/trips", "/years", "/map"]) {
    expect(await (await other.request.get(path)).text(), path).not.toContain("/photos/");
  }
});
