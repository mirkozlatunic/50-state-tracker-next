// Slice 10: phone polish — searching the states list, two columns on phones,
// date fields lined up with the other fields (also in Safari's engine).
import { devices, expect, test, webkit, type Page } from "@playwright/test";
import { logIn, resetData } from "./helpers";

const search = (page: Page) => page.getByRole("searchbox", { name: "Search states" });
const stateLinks = (page: Page) => page.getByRole("main").getByRole("list").getByRole("link");

test.beforeEach(async ({ page }) => {
  await resetData();
  await logIn(page, "/states");
});

test.describe("searching the states list", () => {
  test("typing part of a name shows only the matching states", async ({ page }) => {
    await search(page).fill("new");
    await expect(stateLinks(page)).toHaveText(["New Hampshire", "New Jersey", "New Mexico", "New York"]);
  });

  test("upper and lower case don't matter, and a two-letter code finds its state", async ({ page }) => {
    await search(page).fill("NY");
    await expect(stateLinks(page)).toHaveText(["New York"]);
    await search(page).fill("colo");
    await expect(stateLinks(page)).toHaveText(["Colorado"]);
  });

  test("no match says so; clearing the search shows all 50 again", async ({ page }) => {
    await search(page).fill("atlantis");
    await expect(page.getByText("No state matches “atlantis”.")).toBeVisible();
    await expect(stateLinks(page)).toHaveCount(0);
    await search(page).fill("");
    await expect(stateLinks(page)).toHaveCount(50);
  });

  test("a match still links to its state page", async ({ page }) => {
    await search(page).fill("wyo");
    await stateLinks(page).first().click();
    await expect(page).toHaveURL("/states/WY");
  });

  test("on a phone, the search box uses 16px text so the iPhone doesn't zoom in", async ({ page }, info) => {
    test.skip(info.project.name !== "iphone", "phone");
    expect(await search(page).evaluate((field) => getComputedStyle(field).fontSize)).toBe("16px");
  });
});

test("on a phone, the states sit in two columns", async ({ page }, info) => {
  test.skip(info.project.name !== "iphone", "phone");
  const alabama = (await page.getByRole("link", { name: "Alabama" }).boundingBox())!;
  const alaska = (await page.getByRole("link", { name: "Alaska" }).boundingBox())!;
  const arizona = (await page.getByRole("link", { name: "Arizona" }).boundingBox())!;
  expect(Math.abs(alabama.y - alaska.y)).toBeLessThanOrEqual(1); // same row
  expect(alaska.x).toBeGreaterThan(alabama.x + alabama.width); // side by side
  expect(Math.abs(arizona.x - alabama.x)).toBeLessThanOrEqual(1); // next row starts under Alabama
});

test.describe("date fields line up with the other fields", () => {
  /** Every date field and text field in the form is exactly as wide as the form. */
  async function expectFieldsFullWidth(page: Page) {
    await expect(page.getByRole("main").locator("form")).toBeVisible(); // after the loading skeleton
    const form = (await page.getByRole("main").locator("form").boundingBox())!;
    // The typed-in fields by name (menus and checkboxes also keep invisible helper fields).
    const fields = page
      .getByRole("main")
      .locator('form input[type="date"], form input[name="name"], form input[name="note"]');
    expect(await fields.count()).toBeGreaterThanOrEqual(2);
    for (const field of await fields.all()) {
      const box = (await field.boundingBox())!;
      expect(box.x, await field.getAttribute("name") ?? "").toBeGreaterThanOrEqual(form.x - 0.5);
      expect(box.x + box.width, await field.getAttribute("name") ?? "").toBeLessThanOrEqual(form.x + form.width + 0.5);
    }
  }

  test("the visit form's date field is as wide as the note field", async ({ page }) => {
    await page.goto("/visits/new");
    // The form shows after its loading skeleton, so wait for both fields first.
    await expect(page.getByLabel("Visit date")).toBeVisible();
    await expect(page.getByLabel("Note")).toBeVisible();
    // Measured until it settles: the dev server can add the styles a moment after the page.
    const gap = async () => {
      const date = await page.getByLabel("Visit date").boundingBox();
      const note = await page.getByLabel("Note").boundingBox();
      if (!date || !note) return Infinity; // not drawn yet: measure again
      return Math.max(Math.abs(date.x - note.x), Math.abs(date.width - note.width));
    };
    await expect.poll(gap).toBeLessThanOrEqual(0.5);
    await expectFieldsFullWidth(page);
  });

  test("the trip form's date fields stay inside the form", async ({ page }) => {
    await page.goto("/trips/new");
    await expectFieldsFullWidth(page);
  });

  test("date fields drop the iPhone's own minimum width (the cause of the overflow)", async ({ page }) => {
    await page.goto("/visits/new");
    const style = await page.getByLabel("Visit date").evaluate((field) => {
      const css = getComputedStyle(field);
      return { appearance: css.appearance, minWidth: css.minWidth };
    });
    expect(style).toEqual({ appearance: "none", minWidth: "0px" });
  });

  test("in Safari's engine at iPhone size, the date fields line up too", async ({}, info) => {
    test.skip(info.project.name !== "desktop", "runs its own WebKit iPhone once");
    const browser = await webkit.launch();
    try {
      const page = await (await browser.newContext({ ...devices["iPhone 13"] })).newPage();
      await logIn(page, "/visits/new");
      const date = (await page.getByLabel("Visit date").boundingBox())!;
      const note = (await page.getByLabel("Note").boundingBox())!;
      expect(Math.abs(date.width - note.width)).toBeLessThanOrEqual(0.5);
      await page.goto("/trips/new");
      await expectFieldsFullWidth(page);
    } finally {
      await browser.close();
    }
  });
});
