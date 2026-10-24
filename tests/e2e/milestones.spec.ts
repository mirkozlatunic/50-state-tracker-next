// Slice 19: milestones at 10, 25 and 50 states, on the home page, and a
// one-time celebration card the moment a saved visit reaches one.
import { expect, test, type Page } from "@playwright/test";
import { addVisit, setCelebratedMilestone } from "@/db/queries";
import { STATES } from "@/lib/data/states";
import { logIn, openTestDatabase, resetData, userId } from "./helpers";

// State codes in order (AL, AK, AZ, ...), to fill a tracker quickly.
const CODES = STATES.map(([code]) => code);

/** Visits to the first `count` states (and the celebrated milestone so far). */
async function seed(count: number, celebrated = 0) {
  const db = await openTestDatabase();
  for (const code of CODES.slice(0, count)) {
    await addVisit(db, userId(), { state: code, visitDate: "2024-07-04", note: "", city: null });
  }
  if (celebrated) await setCelebratedMilestone(db, userId(), celebrated);
  db.$client.close();
}

/** Add a visit to `code` through the form, the way you would. */
async function addVisitByForm(page: Page, code: string) {
  await page.goto(`/visits/new?state=${code}`);
  await page.getByLabel("Visit date").fill("2024-07-04");
  await page.getByRole("button", { name: "Save visit" }).click();
  await expect(page).toHaveURL(new RegExp(`/states/${code}`));
}

const card = (page: Page) => page.getByRole("region", { name: "Milestone" });
const milestones = (page: Page) => page.getByRole("list", { name: "Milestones" });

test.beforeEach(async ({ page }) => {
  await resetData();
  await logIn(page);
});

test.describe("on the home page", () => {
  test("with 9 states: none reached yet, 1 to go to 10", async ({ page }) => {
    await seed(9);
    await page.goto("/");
    await expect(milestones(page).getByRole("listitem")).toHaveText(["10 states: 1 to go", "25 states", "50 states"]);
    await expect(milestones(page).locator("[data-reached]")).toHaveCount(0);
  });

  test("with 12 states: 10 reached (marked), 13 to go to 25", async ({ page }) => {
    await seed(12, 10);
    await page.goto("/");
    await expect(milestones(page).getByRole("listitem")).toHaveText(["10 states, reached", "25 states: 13 to go", "50 states"]);
    await expect(milestones(page).locator("[data-reached]")).toHaveCount(1);
    await expect(milestones(page).locator("[data-reached] svg")).toHaveCount(1); // a check mark, not only gold
  });

  test("with all 50: every milestone reached", async ({ page }) => {
    await seed(50, 50);
    await page.goto("/");
    await expect(milestones(page).locator("[data-reached]")).toHaveCount(3);
  });
});

test.describe("the celebration", () => {
  test("the 10th state shows a card once; the address is cleaned up, so a reload doesn't show it again", async ({ page }) => {
    await seed(9);
    await addVisitByForm(page, CODES[9]);
    await expect(card(page)).toBeVisible();
    await expect(card(page).getByRole("heading")).toHaveText("You've visited 10 states!");
    await expect(page).toHaveURL(`/states/${CODES[9]}`); // no ?milestone left in the address
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(card(page)).toHaveCount(0);
  });

  test("the card closes with its button", async ({ page }) => {
    await seed(9);
    await addVisitByForm(page, CODES[9]);
    await card(page).getByRole("button", { name: "Close" }).click();
    await expect(card(page)).toHaveCount(0);
  });

  test("the next visit after a milestone shows no card", async ({ page }) => {
    await seed(10, 10);
    await addVisitByForm(page, CODES[10]);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(card(page)).toHaveCount(0);
  });

  test("another visit to a state already counted shows no card", async ({ page }) => {
    await seed(9);
    await addVisitByForm(page, CODES[9]); // the 10th: celebrated
    await addVisitByForm(page, CODES[9]); // same state again
    await expect(card(page)).toHaveCount(0);
  });

  test("25 states gets its own card", async ({ page }) => {
    await seed(24, 10);
    await addVisitByForm(page, CODES[24]);
    await expect(card(page).getByRole("heading")).toHaveText("You've visited 25 states!");
  });

  test("all 50 gets a card too", async ({ page }) => {
    await seed(49, 25);
    await addVisitByForm(page, CODES[49]);
    await expect(card(page).getByRole("heading")).toHaveText("You've visited all 50 states!");
  });

  test("typing ?milestone=10 into the address doesn't fake a celebration", async ({ page }) => {
    await seed(3);
    await page.goto(`/states/${CODES[0]}?milestone=10`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(card(page)).toHaveCount(0);
  });

  test("the card fits an iPhone (390px) without sideways scrolling", async ({ page }) => {
    await seed(9);
    await page.setViewportSize({ width: 390, height: 844 });
    await addVisitByForm(page, CODES[9]);
    await expect(card(page)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
