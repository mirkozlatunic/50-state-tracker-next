// Slice 29: each visit row on a state page has an "Add photos" button, next to
// Edit and Delete. It opens the visit's page at its Photos section. A visit
// that already has 6 photos (the most allowed) has no button.
import { expect, test, type Page } from "@playwright/test";
import { addVisit } from "@/db/queries";
import { logIn, openTestDatabase, resetData, seedPhoto, userId } from "./helpers";
import { expectCentersLineUp } from "./layout-helpers";

/** Two Colorado visits, the newer one with `photos` photos. Returns their ids. */
async function seed(photos = 0) {
  const db = await openTestDatabase();
  const older = await addVisit(db, userId(), { state: "CO", visitDate: "2023-05-01", note: "", city: null });
  const newer = await addVisit(db, userId(), { state: "CO", visitDate: "2024-07-04", note: "", city: "Denver" });
  for (let n = 1; n <= photos; n++) await seedPhoto(db, newer, n);
  db.$client.close();
  return { older, newer };
}

const visitRow = (page: Page, date: string) => page.getByRole("list", { name: "Visits" }).getByRole("listitem").filter({ hasText: date });
const addPhotos = (page: Page, date: string) => page.getByRole("link", { name: `Add photos to the visit on ${date}` });

test.beforeEach(async ({ page }) => {
  await resetData();
  await logIn(page);
});

test("each visit row has its own Add photos button", async ({ page }) => {
  const ids = await seed();
  await page.goto("/states/CO");
  for (const [date, id] of [["2023-05-01", ids.older], ["2024-07-04", ids.newer]] as const) {
    const button = visitRow(page, date).getByRole("link", { name: `Add photos to the visit on ${date}` });
    await expect(button).toBeVisible();
    await expect(button).toHaveText("Add photos"); // what you see; the longer name is for screen readers
    await expect(button).toHaveAttribute("href", `/visits/${id}#photos`);
  }
});

test("it opens that visit's page at its Photos section, with Add photos in view", async ({ page }) => {
  const ids = await seed();
  await page.goto("/states/CO");
  await addPhotos(page, "2024-07-04").click();
  await expect(page).toHaveURL(`/visits/${ids.newer}#photos`);
  const photos = page.getByRole("region", { name: "Photos" });
  await expect(photos).toHaveAttribute("id", "photos");
  await expect(photos.getByText("Add photos")).toBeInViewport();
  // The heading isn't hidden under the header after the jump.
  const header = await page.getByRole("banner").boundingBox();
  const heading = await photos.getByRole("heading", { name: "Photos" }).boundingBox();
  expect(heading!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
});

test("a visit with 6 photos has no Add photos button; the others still do", async ({ page }) => {
  await seed(6);
  await page.goto("/states/CO");
  await expect(visitRow(page, "2024-07-04")).toContainText("6 photos");
  await expect(addPhotos(page, "2024-07-04")).toHaveCount(0);
  await expect(addPhotos(page, "2023-05-01")).toBeVisible();
});

test("Add photos, Edit and Delete are shadcn buttons of one height, on one line", async ({ page }) => {
  await seed(2);
  await page.goto("/states/CO");
  const row = visitRow(page, "2024-07-04");
  const buttons = [addPhotos(page, "2024-07-04"), row.getByRole("link", { name: "Edit" }), row.getByRole("button", { name: "Delete" })];
  for (const button of buttons) await expect(button).toHaveAttribute("data-slot", "button");
  const heights = await Promise.all(buttons.map(async (button) => (await button.boundingBox())?.height));
  expect(new Set(heights).size).toBe(1);
  await expectCentersLineUp(buttons);
  // Nothing sticks out sideways, on any screen size.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
