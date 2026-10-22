// Slice 4: the states list, a state's page, and adding, editing and deleting
// visits (the same checks as the Flask app's state and visit tests).
import { expect, test, type Page } from "@playwright/test";
import { addVisit } from "@/db/queries";
import { addTripForTest } from "../unit/trip-helpers";
import { daysFromToday, logIn, openTestDatabase, resetData } from "./helpers";
import { expectCentersLineUp } from "./layout-helpers";

/** Save a visit straight into the test database; returns its id. */
async function saveVisit(state: string, visitDate: string, note = "", city: string | null = null) {
  const db = await openTestDatabase();
  const id = await addVisit(db, { state, visitDate, note, city });
  db.$client.close();
  return id;
}

/** Pick a state in the shadcn State menu. */
async function chooseState(page: Page, name: string) {
  await page.getByRole("combobox", { name: "State" }).click();
  await page.getByRole("option", { name, exact: true }).click();
}

/** Type a future date. The field stops the browser at today (max), so remove
 * that limit first, as an older browser might, to reach the server's own check. */
async function fillFutureDate(page: Page) {
  const field = page.getByLabel("Visit date");
  await expect(field).toHaveAttribute("max", daysFromToday(0));
  await field.evaluate((input) => input.removeAttribute("max"));
  await field.fill(daysFromToday(1));
}

/** Search for a city in the City box and pick it. */
async function chooseCity(page: Page, search: string, name: string) {
  await page.getByRole("combobox", { name: "City" }).click();
  await page.getByPlaceholder("Search cities…").fill(search);
  await page.getByRole("option", { name, exact: true }).click();
}

const counter = (page: Page) => page.getByRole("banner").getByText(/^\d+ of 50$/);

test.beforeEach(async ({ page }) => {
  await resetData();
  await logIn(page);
});

test.describe("the states list", () => {
  test("the home page opens the states list", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/states");
    await expect(page).toHaveTitle("States · 50 States Tracker");
  });

  test("lists all 50 states, each linking to its page", async ({ page }) => {
    await page.goto("/states");
    const links = page.getByRole("main").getByRole("link", { name: /^[A-Z][a-z]/ });
    await expect(links).toHaveCount(50);
    await expect(page.getByRole("link", { name: "California" })).toHaveAttribute("href", "/states/CA");
    await expect(page.getByRole("link", { name: "Wyoming" })).toHaveAttribute("href", "/states/WY");
  });

  test("marks visited states", async ({ page }) => {
    await saveVisit("CA", "2024-07-04");
    await page.goto("/states");
    const california = page.getByRole("listitem").filter({ hasText: "California" });
    await expect(california.getByText("visited")).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Nevada" }).getByText("visited")).toHaveCount(0);
  });

  test("the states list is the current page in the nav", async ({ page }) => {
    await page.goto("/states");
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "States" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

test.describe("a state's page", () => {
  test("shows the name and code, and says when there are no visits", async ({ page }) => {
    await page.goto("/states/WY");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wyoming WY");
    await expect(page.getByText("No visits yet.")).toBeVisible();
    await expect(page).toHaveTitle("Wyoming · 50 States Tracker");
  });

  test("lists its visits newest first, with date, city and note", async ({ page }) => {
    await saveVisit("CA", "2020-01-01", "first");
    await saveVisit("CA", "2024-07-04", "Big Sur road trip", "Monterey");
    await saveVisit("NV", "2025-01-01", "Nevada note");
    await page.goto("/states/CA");
    const visits = page.getByRole("list", { name: "Visits" }).getByRole("listitem");
    await expect(visits).toHaveCount(2);
    await expect(visits.nth(0)).toContainText("2024-07-04");
    await expect(visits.nth(0)).toContainText("Monterey");
    await expect(visits.nth(0)).toContainText("Big Sur road trip");
    await expect(visits.nth(1)).toContainText("first");
    await expect(page.getByText("Nevada note")).toHaveCount(0);
  });

  test("a lower-case code works too", async ({ page }) => {
    await page.goto("/states/ca");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("California CA");
  });

  test("an unknown state gives the not-found page", async ({ page }) => {
    for (const code of ["DC", "XX"]) {
      const response = await page.goto(`/states/${code}`);
      expect(response?.status()).toBe(404);
    }
  });

  test("a note is shown as text, never run as HTML", async ({ page }) => {
    await saveVisit("CA", "2024-07-04", "<b>bold</b>");
    await page.goto("/states/CA");
    await expect(page.getByText("<b>bold</b>")).toBeVisible();
  });

  test("shows upcoming trips that include it, with only this state's cities", async ({ page }) => {
    const db = await openTestDatabase();
    await addTripForTest(db, {
      name: "Four Corners weekend",
      startDate: daysFromToday(7),
      endDate: daysFromToday(9),
      states: ["UT", "AZ"],
      cities: [{ name: "Moab", state: "UT" }, { name: "Page", state: "AZ" }],
    });
    await addTripForTest(db, { name: "Ended trip", startDate: "2025-06-01", endDate: "2025-06-03", states: ["UT"] });
    db.$client.close();
    await page.goto("/states/UT");
    const trips = page.getByRole("list", { name: "Planned trips" });
    await expect(trips).toContainText("Four Corners weekend");
    await expect(trips).toContainText("Moab");
    await expect(trips).not.toContainText("Page");
    await expect(page.getByText("Ended trip")).toHaveCount(0);
  });

  test("links to add a visit with the state already chosen", async ({ page }) => {
    await page.goto("/states/CA");
    await page.getByRole("link", { name: "Add a visit" }).click();
    await expect(page).toHaveURL("/visits/new?state=CA");
    await expect(page.getByRole("combobox", { name: "State" })).toHaveText(/California/);
  });
});

test.describe("adding a visit", () => {
  test("the form starts on a placeholder and explains that layovers don't count", async ({ page }) => {
    await page.goto("/visits/new");
    await expect(page.getByRole("combobox", { name: "State" })).toHaveText(/Choose a state/);
    await expect(page.getByText("Layovers don't count.")).toBeVisible();
  });

  test("a lower-case state in the link is still chosen", async ({ page }) => {
    await page.goto("/visits/new?state=ca");
    await expect(page.getByRole("combobox", { name: "State" })).toHaveText(/California/);
  });

  test("a form sent after the login ran out saves nothing and asks for the password", async ({ page, context }) => {
    await page.goto("/visits/new?state=CA");
    await page.getByLabel("Visit date").fill("2024-07-04");
    await page.getByLabel("Note").fill("should not be saved");
    await context.clearCookies(); // as if the 30 days ran out while the form was open
    await page.getByRole("button", { name: "Save visit" }).click();
    await expect(page).toHaveURL(/\/login/);
    await logIn(page, "/states/CA");
    await expect(page.getByText("No visits yet.")).toBeVisible();
  });

  test("an unknown state in the link falls back to the placeholder", async ({ page }) => {
    await page.goto("/visits/new?state=DC");
    await expect(page.getByRole("combobox", { name: "State" })).toHaveText(/Choose a state/);
  });

  test("the city box waits for a state, then searches that state's cities", async ({ page }) => {
    await page.goto("/visits/new");
    await expect(page.getByRole("combobox", { name: "City" })).toBeDisabled();
    await chooseState(page, "Colorado");
    await page.getByRole("combobox", { name: "City" }).click();
    await page.getByPlaceholder("Search cities…").fill("denv");
    await expect(page.getByRole("option", { name: "Denver", exact: true })).toBeVisible();
    await expect(page.getByRole("option", { name: "Seattle" })).toHaveCount(0);
  });

  test("saving goes to the state's page, shows the visit and updates the counter", async ({ page }) => {
    await page.goto("/visits/new");
    await expect(counter(page)).toHaveText("0 of 50");
    await chooseState(page, "California");
    await chooseCity(page, "los ang", "Los Angeles");
    await page.getByLabel("Visit date").fill("2024-07-04");
    await page.getByLabel("Note").fill("Griffith Observatory");
    await page.getByRole("button", { name: "Save visit" }).click();
    await expect(page).toHaveURL("/states/CA");
    const visit = page.getByRole("list", { name: "Visits" }).getByRole("listitem").first();
    await expect(visit).toContainText("2024-07-04");
    await expect(visit).toContainText("Los Angeles");
    await expect(visit).toContainText("Griffith Observatory");
    await expect(counter(page)).toHaveText("1 of 50");
  });

  test("a visit today is fine; the note and city are optional", async ({ page }) => {
    await page.goto("/visits/new?state=NV");
    await page.getByLabel("Visit date").fill(daysFromToday(0));
    await page.getByRole("button", { name: "Save visit" }).click();
    await expect(page).toHaveURL("/states/NV");
  });

  test("a future date is refused, nothing is saved, and what you typed stays", async ({ page }) => {
    await page.goto("/visits/new?state=CA");
    await fillFutureDate(page);
    await page.getByLabel("Note").fill("not yet");
    await page.getByRole("button", { name: "Save visit" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("The visit date can't be in the future.");
    await expect(page.getByLabel("Note")).toHaveValue("not yet");
    await expect(page.getByRole("combobox", { name: "State" })).toHaveText(/California/);
    await expect(counter(page)).toHaveText("0 of 50");
  });

  test("several visits to one state count once", async ({ page }) => {
    await saveVisit("CA", "2024-07-04");
    await saveVisit("CA", "2025-01-01");
    await page.goto("/states");
    await expect(counter(page)).toHaveText("1 of 50");
  });
});

test.describe("editing a visit", () => {
  test("the form is filled in with the visit", async ({ page }) => {
    const id = await saveVisit("CO", "2024-07-04", "Red Rocks", "Denver");
    await page.goto(`/visits/${id}/edit`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Edit visit");
    await expect(page.getByRole("combobox", { name: "State" })).toHaveText(/Colorado/);
    await expect(page.getByRole("combobox", { name: "City" })).toHaveText(/Denver/);
    await expect(page.getByLabel("Visit date")).toHaveValue("2024-07-04");
    await expect(page.getByLabel("Note")).toHaveValue("Red Rocks");
  });

  test("moving a visit to another state saves it and goes to the new state's page", async ({ page }) => {
    const id = await saveVisit("CA", "2024-07-04", "wrong state");
    await page.goto(`/visits/${id}/edit`);
    await chooseState(page, "Nevada");
    await page.getByLabel("Note").fill("right state");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL("/states/NV");
    await expect(page.getByText("right state")).toBeVisible();
    await page.goto("/states/CA");
    await expect(page.getByText("No visits yet.")).toBeVisible();
  });

  test("a city can be removed", async ({ page }) => {
    const id = await saveVisit("CO", "2024-07-04", "", "Denver");
    await page.goto(`/visits/${id}/edit`);
    await page.getByRole("button", { name: "Remove city" }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("list", { name: "Visits" })).not.toContainText("Denver");
  });

  test("a future date is refused and nothing changes", async ({ page }) => {
    const id = await saveVisit("CA", "2024-07-04", "keep me");
    await page.goto(`/visits/${id}/edit`);
    await fillFutureDate(page);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("The visit date can't be in the future.");
    await page.goto("/states/CA");
    await expect(page.getByRole("list", { name: "Visits" })).toContainText("2024-07-04");
  });

  test("an unknown visit shows the not-found page", async ({ page }) => {
    // The page has started streaming by the time the database answers, so the
    // status stays 200; Next.js marks the page so search engines skip it.
    await page.goto("/visits/999999/edit");
    await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
    await expect(page.locator('meta[name="robots"][content="noindex"]').first()).toBeAttached();
  });
});

test.describe("deleting a visit", () => {
  test("asks first; Cancel keeps the visit", async ({ page }) => {
    await saveVisit("CA", "2024-07-04", "still here");
    await page.goto("/states/CA");
    await page.getByRole("button", { name: "Delete" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("Delete this visit?");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("still here")).toBeVisible();
  });

  test("deleting the only visit makes the state unvisited again", async ({ page }) => {
    await saveVisit("CA", "2024-07-04", "gone soon");
    await page.goto("/states/CA");
    await expect(counter(page)).toHaveText("1 of 50");
    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("No visits yet.")).toBeVisible();
    await expect(counter(page)).toHaveText("0 of 50");
  });

  test("deleting one of two visits keeps the state visited", async ({ page }) => {
    await saveVisit("CA", "2024-07-04", "first");
    await saveVisit("CA", "2025-07-04", "second");
    await page.goto("/states/CA");
    await page.getByRole("button", { name: "Delete" }).first().click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("list", { name: "Visits" }).getByRole("listitem")).toHaveCount(1);
    await expect(counter(page)).toHaveText("1 of 50");
  });
});

test.describe("buttons line up", () => {
  test("Edit and Delete are shadcn buttons of one height, on one line, Delete in red", async ({ page }) => {
    await saveVisit("CA", "2024-07-04", "check the buttons");
    await page.goto("/states/CA");
    const visit = page.getByRole("list", { name: "Visits" }).getByRole("listitem").first();
    const edit = visit.getByRole("link", { name: "Edit" });
    const remove = visit.getByRole("button", { name: "Delete" });
    await expect(edit).toHaveAttribute("data-slot", "button");
    await expect(remove).toHaveAttribute("data-slot", "button");
    expect((await edit.boundingBox())?.height).toBe((await remove.boundingBox())?.height);
    await expectCentersLineUp([edit, remove]);
    await expect(remove).toHaveClass(/text-destructive/);
  });

  test("the form's Cancel and Save sit on one line on a computer, right-aligned", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "computer layout");
    await page.goto("/visits/new");
    const cancel = page.getByRole("link", { name: "Cancel" });
    const save = page.getByRole("button", { name: "Save visit" });
    await expectCentersLineUp([cancel, save]);
    const form = (await page.getByRole("main").locator("form").boundingBox())!;
    const saveBox = (await save.boundingBox())!;
    expect(Math.abs(form.x + form.width - (saveBox.x + saveBox.width))).toBeLessThanOrEqual(1);
  });

  test("on a phone, the form's buttons are full width and stacked, Save on top", async ({ page }, info) => {
    test.skip(info.project.name !== "iphone", "phone layout");
    await page.goto("/visits/new");
    const form = (await page.getByRole("main").locator("form").boundingBox())!;
    const save = (await page.getByRole("button", { name: "Save visit" }).boundingBox())!;
    const cancel = (await page.getByRole("link", { name: "Cancel" }).boundingBox())!;
    for (const box of [save, cancel]) expect(Math.abs(box.width - form.width)).toBeLessThanOrEqual(1);
    expect(save.y).toBeLessThan(cancel.y);
  });

  test("on a phone, the form's text is 16px, so the iPhone doesn't zoom in", async ({ page }, info) => {
    test.skip(info.project.name !== "iphone", "phone layout");
    await page.goto("/visits/new");
    for (const label of ["Visit date", "Note"]) {
      const size = await page.getByLabel(label).evaluate((field) => getComputedStyle(field).fontSize);
      expect(size).toBe("16px");
    }
  });
});
