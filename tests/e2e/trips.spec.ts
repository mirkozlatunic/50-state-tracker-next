// Slice 5: the trips page, and planning, editing and deleting trips
// (the same checks as the Flask app's trip tests).
import { expect, test, type Page } from "@playwright/test";
import { addTrip, addVisit, getTrip } from "@/db/queries";
import { daysFromToday, expectCurrentPage, logIn, openTestDatabase, resetData, today, userId } from "./helpers";
import { expectCentersLineUp } from "./layout-helpers";

type NewTrip = { name: string; startDate: string; endDate: string; states: string[]; cities?: { name: string; state: string }[] };

/** Save a trip straight into the test database; returns its id. */
async function saveTrip(trip: NewTrip) {
  const db = await openTestDatabase();
  const id = await addTrip(db, userId(), { cities: [], ...trip });
  db.$client.close();
  return id;
}

/** The trip as stored in the test database. */
async function storedTrip(id: number) {
  const db = await openTestDatabase();
  const trip = await getTrip(db, userId(), id);
  db.$client.close();
  return trip;
}

/** Fill in the trip form's name, dates and states. */
async function fillTrip(page: Page, { name, start, end, states }: { name: string; start: string; end: string; states: string[] }) {
  await page.getByLabel("Trip name").fill(name);
  await page.getByLabel("Start date").fill(start);
  await page.getByLabel("End date").fill(end);
  for (const state of states) await page.getByRole("checkbox", { name: state, exact: true }).check();
}

/** Search for a city among the ticked states and add it. */
async function addCity(page: Page, search: string, label: string) {
  await page.getByRole("combobox", { name: "Add a city" }).click();
  await page.getByPlaceholder("Search cities…").fill(search);
  await page.getByRole("option", { name: label, exact: true }).click();
}

/** Remove the date picker's lower limit, as an older browser might, to reach the server's own check. */
async function dropStartLimit(page: Page) {
  await page.getByLabel("Start date").evaluate((input) => input.removeAttribute("min"));
}

const tripList = (page: Page) => page.getByRole("list", { name: "Trips" });
const counter = (page: Page) => page.getByRole("banner").getByText(/^\d+ of 50$/);

test.beforeEach(async ({ page }) => {
  await resetData();
  await logIn(page);
});

test.describe("the trips page", () => {
  test("says so when no trips are planned, and links to plan one", async ({ page }) => {
    await page.goto("/trips");
    await expect(page).toHaveTitle("Trips · 50 States Tracker");
    await expect(page.getByText("No trips planned yet.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Plan a trip" })).toHaveAttribute("href", "/trips/new");
    await expectCurrentPage(page, "Trips");
  });

  test("lists a trip with its dates, states (linking to their pages) and cities", async ({ page }) => {
    await saveTrip({
      name: "Four Corners weekend",
      startDate: daysFromToday(7),
      endDate: daysFromToday(9),
      states: ["AZ", "UT"],
      cities: [{ name: "Moab", state: "UT" }],
    });
    await page.goto("/trips");
    const trip = tripList(page).getByRole("listitem").first();
    await expect(trip).toContainText("Four Corners weekend");
    await expect(trip).toContainText(`${daysFromToday(7)} to ${daysFromToday(9)}`);
    await expect(trip.getByRole("link", { name: "Arizona" })).toHaveAttribute("href", "/states/AZ");
    await expect(trip.getByRole("link", { name: "Utah" })).toHaveAttribute("href", "/states/UT");
    await expect(trip).toContainText("Moab, UT");
  });

  test("lists trips soonest first, leaves out ended trips and keeps trips in progress", async ({ page }) => {
    await saveTrip({ name: "Later", startDate: daysFromToday(30), endDate: daysFromToday(31), states: ["ME"] });
    await saveTrip({ name: "Sooner", startDate: daysFromToday(7), endDate: daysFromToday(8), states: ["VT"] });
    await saveTrip({ name: "Ended", startDate: "2025-06-01", endDate: "2025-06-03", states: ["OR"] });
    await saveTrip({ name: "Happening now", startDate: daysFromToday(-1), endDate: daysFromToday(1), states: ["TX"] });
    await page.goto("/trips");
    const names = tripList(page).getByRole("listitem").locator("strong");
    await expect(names).toHaveText(["Happening now", "Sooner", "Later"]);
  });
});

test.describe("planning a trip", () => {
  test("the form has a checkbox for each of the 50 states", async ({ page }) => {
    await page.goto("/trips/new");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Plan a trip");
    await expect(page.getByRole("group", { name: "States" }).getByRole("checkbox")).toHaveCount(50);
  });

  test("a trip with two states and a city is saved and listed", async ({ page }) => {
    await page.goto("/trips/new");
    await fillTrip(page, { name: "Four Corners weekend", start: daysFromToday(7), end: daysFromToday(9), states: ["Arizona", "Utah"] });
    await addCity(page, "moa", "Moab, UT");
    await page.getByRole("button", { name: "Save trip" }).click();
    await expect(page).toHaveURL("/trips");
    const trip = tripList(page).getByRole("listitem").first();
    await expect(trip).toContainText("Four Corners weekend");
    await expect(trip).toContainText("Moab, UT");
  });

  test("the city search only offers cities in the ticked states", async ({ page }) => {
    await page.goto("/trips/new");
    await expect(page.getByRole("combobox", { name: "Add a city" })).toBeDisabled();
    await page.getByRole("checkbox", { name: "Colorado", exact: true }).check();
    await page.getByRole("combobox", { name: "Add a city" }).click();
    await page.getByPlaceholder("Search cities…").fill("denv");
    await expect(page.getByRole("option", { name: "Denver, CO", exact: true })).toBeVisible();
    await page.getByPlaceholder("Search cities…").fill("seattle");
    await expect(page.getByRole("option", { name: /Seattle/ })).toHaveCount(0);
  });

  test("a chosen city can be removed again", async ({ page }) => {
    await page.goto("/trips/new");
    await page.getByRole("checkbox", { name: "Colorado", exact: true }).check();
    await addCity(page, "denv", "Denver, CO");
    await page.getByRole("button", { name: "Remove Denver, CO" }).click();
    await expect(page.getByRole("list", { name: "Trip cities" })).toHaveCount(0);
  });

  test("a city whose state was unticked is refused", async ({ page }) => {
    await page.goto("/trips/new");
    await fillTrip(page, { name: "Weekend", start: daysFromToday(7), end: daysFromToday(8), states: ["Colorado", "Utah"] });
    await addCity(page, "moa", "Moab, UT");
    await page.getByRole("checkbox", { name: "Utah", exact: true }).uncheck();
    await page.getByRole("button", { name: "Save trip" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("Moab, UT isn't in this trip's states.");
  });

  test("a trip to a state you've already visited is fine, and planning doesn't count as visiting", async ({ page }) => {
    const db = await openTestDatabase();
    await addVisit(db, userId(), { state: "CA", visitDate: "2024-07-04", note: "", city: null });
    db.$client.close();
    await page.goto("/trips/new");
    await fillTrip(page, { name: "Back to California", start: daysFromToday(7), end: daysFromToday(8), states: ["California", "Nevada"] });
    await page.getByRole("button", { name: "Save trip" }).click();
    await expect(page).toHaveURL("/trips");
    await expect(counter(page)).toHaveText("1 of 50");
  });

  test("the start date picker starts tomorrow; a trip starting today is refused and what you typed stays", async ({ page }) => {
    await page.goto("/trips/new");
    await expect(page.getByLabel("Start date")).toHaveAttribute("min", daysFromToday(1));
    await dropStartLimit(page);
    await fillTrip(page, { name: "Four Corners weekend", start: today(), end: daysFromToday(2), states: ["Arizona", "Utah"] });
    await page.getByRole("button", { name: "Save trip" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("A planned trip must start in the future.");
    await expect(page.getByLabel("Trip name")).toHaveValue("Four Corners weekend");
    await expect(page.getByRole("checkbox", { name: "Arizona", exact: true })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Utah", exact: true })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "California", exact: true })).not.toBeChecked();
  });

  test("an end before the start, or no states, is refused", async ({ page }) => {
    await page.goto("/trips/new");
    await fillTrip(page, { name: "Backwards", start: daysFromToday(9), end: daysFromToday(7), states: [] });
    await page.getByRole("button", { name: "Save trip" }).click();
    const errors = page.getByRole("main").getByRole("alert");
    await expect(errors).toContainText("The end date can't be before the start date.");
    await expect(errors).toContainText("Please choose at least one state.");
    await page.goto("/trips");
    await expect(page.getByText("No trips planned yet.")).toBeVisible();
  });

  test("from the years page: the start stays in that year, and saving goes back there", async ({ page }) => {
    const nextYear = Number(today().slice(0, 4)) + 1;
    await page.goto(`/trips/new?year=${nextYear}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Plan a trip in ${nextYear}`);
    await expect(page.getByLabel("Start date")).toHaveAttribute("min", `${nextYear}-01-01`);
    await expect(page.getByLabel("Start date")).toHaveAttribute("max", `${nextYear}-12-31`);
    await fillTrip(page, { name: "Next year", start: `${nextYear}-05-01`, end: `${nextYear}-05-02`, states: ["Vermont"] });
    await page.getByRole("button", { name: "Save trip" }).click();
    await expect(page).toHaveURL("/years");
  });

  test("a past or bad year in the address is ignored", async ({ page }) => {
    for (const year of ["1999", "banana"]) {
      await page.goto(`/trips/new?year=${year}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Plan a trip");
      await expect(page.getByLabel("Start date")).not.toHaveAttribute("max", /.+/);
    }
  });
});

test.describe("editing a trip", () => {
  test("the form is filled in with the trip", async ({ page }) => {
    const id = await saveTrip({
      name: "Four Corners weekend",
      startDate: daysFromToday(7),
      endDate: daysFromToday(9),
      states: ["AZ", "UT"],
      cities: [{ name: "Moab", state: "UT" }],
    });
    await page.goto(`/trips/${id}/edit`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Edit trip");
    await expect(page.getByLabel("Trip name")).toHaveValue("Four Corners weekend");
    await expect(page.getByLabel("Start date")).toHaveValue(daysFromToday(7));
    await expect(page.getByLabel("End date")).toHaveValue(daysFromToday(9));
    await expect(page.getByRole("checkbox", { name: "Arizona", exact: true })).toBeChecked();
    await expect(page.getByRole("list", { name: "Trip cities" })).toContainText("Moab, UT");
  });

  test("changes the name, dates, states and cities", async ({ page }) => {
    const id = await saveTrip({ name: "Old name", startDate: daysFromToday(7), endDate: daysFromToday(9), states: ["AZ"] });
    await page.goto(`/trips/${id}/edit`);
    await page.getByLabel("Trip name").fill("Colorado instead");
    await page.getByLabel("Start date").fill(daysFromToday(14));
    await page.getByLabel("End date").fill(daysFromToday(16));
    await page.getByRole("checkbox", { name: "Arizona", exact: true }).uncheck();
    await page.getByRole("checkbox", { name: "Colorado", exact: true }).check();
    await addCity(page, "denv", "Denver, CO");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL("/trips");
    expect(await storedTrip(id)).toEqual({
      id,
      name: "Colorado instead",
      startDate: daysFromToday(14),
      endDate: daysFromToday(16),
      states: ["CO"],
      cities: [{ name: "Denver", state: "CO" }],
    });
  });

  test("a trip in progress can be renamed, keeping its start date", async ({ page }) => {
    const id = await saveTrip({ name: "Road trip", startDate: daysFromToday(-1), endDate: daysFromToday(2), states: ["TX"] });
    await page.goto(`/trips/${id}/edit`);
    await expect(page.getByLabel("Start date")).toHaveAttribute("min", daysFromToday(-1));
    await page.getByLabel("Trip name").fill("Texas road trip");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL("/trips");
    expect((await storedTrip(id))?.name).toBe("Texas road trip");
  });

  test("a trip in progress can't move to another past date", async ({ page }) => {
    const id = await saveTrip({ name: "Road trip", startDate: daysFromToday(-1), endDate: daysFromToday(2), states: ["TX"] });
    await page.goto(`/trips/${id}/edit`);
    await dropStartLimit(page);
    await page.getByLabel("Start date").fill(daysFromToday(-2));
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("A planned trip must start in the future.");
    expect((await storedTrip(id))?.startDate).toBe(daysFromToday(-1));
  });

  test("from the years page, saving goes back there", async ({ page }) => {
    const id = await saveTrip({ name: "Weekend", startDate: daysFromToday(7), endDate: daysFromToday(8), states: ["VT"] });
    await page.goto(`/trips/${id}/edit?return_to=years`);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL("/years");
  });

  test("an unknown trip shows the not-found page", async ({ page }) => {
    await page.goto("/trips/999999/edit");
    await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
  });
});

test.describe("deleting a trip", () => {
  test("asks first; Cancel keeps the trip", async ({ page }) => {
    await saveTrip({ name: "Keep me", startDate: daysFromToday(7), endDate: daysFromToday(8), states: ["VT"] });
    await page.goto("/trips");
    await page.getByRole("button", { name: "Delete" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("Delete this trip?");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    await expect(tripList(page).getByText("Keep me")).toBeVisible();
  });

  test("deleting removes the trip from every page, and keeps visits", async ({ page }) => {
    const db = await openTestDatabase();
    await addVisit(db, userId(), { state: "VT", visitDate: "2024-07-04", note: "", city: null });
    db.$client.close();
    await saveTrip({ name: "Gone soon", startDate: daysFromToday(7), endDate: daysFromToday(8), states: ["VT"] });
    await page.goto("/trips");
    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("No trips planned yet.")).toBeVisible();
    await page.goto("/states/VT");
    await expect(page.getByText("Gone soon")).toHaveCount(0);
    await expect(counter(page)).toHaveText("1 of 50");
  });
});

test.describe("buttons line up", () => {
  test("Edit and Delete on a trip are shadcn buttons of one height, on one line", async ({ page }) => {
    await saveTrip({ name: "Weekend", startDate: daysFromToday(7), endDate: daysFromToday(8), states: ["VT"] });
    await page.goto("/trips");
    const trip = tripList(page).getByRole("listitem").first();
    const edit = trip.getByRole("link", { name: "Edit" });
    const remove = trip.getByRole("button", { name: "Delete" });
    await expect(edit).toHaveAttribute("data-slot", "button");
    await expect(remove).toHaveAttribute("data-slot", "button");
    await expectCentersLineUp([edit, remove]);
  });

  test("on a phone, the state checkboxes sit in two columns", async ({ page }, info) => {
    test.skip(info.project.name !== "iphone", "phone layout");
    await page.goto("/trips/new");
    const alabama = (await page.getByRole("checkbox", { name: "Alabama", exact: true }).boundingBox())!;
    const alaska = (await page.getByRole("checkbox", { name: "Alaska", exact: true }).boundingBox())!;
    const arizona = (await page.getByRole("checkbox", { name: "Arizona", exact: true }).boundingBox())!;
    expect(Math.abs(alabama.y - alaska.y)).toBeLessThanOrEqual(1); // same row
    expect(alaska.x).toBeGreaterThan(alabama.x); // side by side
    expect(Math.abs(arizona.x - alabama.x)).toBeLessThanOrEqual(1); // next row starts under Alabama
  });
});
