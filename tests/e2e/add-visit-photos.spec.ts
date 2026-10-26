// Slice 30: photos while adding a visit. The add-visit form has an optional
// "Photos" field (up to 6). The visit is saved first, then the browser shrinks
// and uploads each photo, the same way the visit page does. If a photo can't
// be added, the visit stays saved and the form says which photo and why, with
// a link to the visit's page. Editing a visit has no photo field.
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { addVisit, countPhotoUpload, loadVisits, photosForVisit, visitsForState } from "@/db/queries";
import { todayIn } from "@/lib/dates";
import { PHOTO_MAX_PER_MONTH, photoLimitMessage, uploadMonth } from "@/lib/photos";
import { daysFromToday, logIn, openTestDatabase, resetData, userId } from "./helpers";
import { expectCentersLineUp } from "./layout-helpers";

const FIXTURES = join(__dirname, "fixtures");
const BIG = join(FIXTURES, "big-photo.jpg"); // 2400 x 1600, with an Exif block
const SMALL = join(FIXTURES, "small-photo.jpg");
const NOT_A_PHOTO = join(FIXTURES, "not-a-photo.jpg"); // text, named .jpg

const photoField = (page: Page) => page.getByRole("group", { name: "Photos (optional)" });
const chosen = (page: Page) => photoField(page).getByRole("list", { name: "Chosen photos" }).getByRole("listitem");

/** Fill in a Colorado visit on /visits/new (without saving). */
async function fillVisit(page: Page) {
  await page.goto("/visits/new?state=CO");
  await page.getByLabel("Visit date").fill("2024-07-04");
  await page.getByLabel("Note").fill("Red Rocks");
}

/** Choose files in the form's photo field. */
const choose = (page: Page, files: string[]) => photoField(page).getByLabel("Choose photos").setInputFiles(files);

/** My Colorado visits and each one's photos, straight from the test database. */
async function savedVisits() {
  const db = await openTestDatabase();
  const visits = await visitsForState(db, userId(), "CO");
  const result = [];
  for (const visit of visits) result.push({ id: visit.id, photos: (await photosForVisit(db, userId(), visit.id)).length });
  db.$client.close();
  return result;
}

/** Set how many photos test person A has uploaded this month. */
async function setUploads(count: number) {
  const db = await openTestDatabase();
  for (let i = 0; i < count; i++) await countPhotoUpload(db, userId(), uploadMonth(todayIn()));
  db.$client.close();
}

test.beforeEach(async ({ page }) => {
  await resetData();
  await logIn(page);
});

test("the add-visit form has an optional photo field that takes images; editing a visit has none", async ({ page }) => {
  await page.goto("/visits/new");
  await expect(photoField(page)).toBeVisible();
  await expect(photoField(page).getByLabel("Choose photos")).toHaveAttribute("accept", "image/*");
  await expect(photoField(page).getByText("Up to 6.")).toBeVisible();

  const db = await openTestDatabase();
  const id = await addVisit(db, userId(), { state: "CO", visitDate: "2024-07-04", note: "", city: null });
  db.$client.close();
  await page.goto(`/visits/${id}/edit`);
  await expect(page.getByLabel("Visit date")).toBeVisible();
  await expect(photoField(page)).toHaveCount(0);
});

test("a visit saved with 2 photos lands on the state page with both photos, shrunk and without Exif", async ({ page }) => {
  await fillVisit(page);
  await choose(page, [BIG, SMALL]);
  await expect(chosen(page)).toHaveCount(2);
  // Each chosen photo shows a small preview before saving.
  await expect(chosen(page).first().getByRole("img")).toBeVisible();
  await page.getByRole("button", { name: "Save visit" }).click();

  await expect(page).toHaveURL("/states/CO", { timeout: 20_000 });
  await expect(page.getByRole("list", { name: "Visits" }).getByRole("listitem").first()).toContainText("2 photos");
  const [visit] = await savedVisits();
  expect(visit.photos).toBe(2);

  // The big photo was shrunk to at most 2000 px, and its Exif data is gone.
  await page.goto(`/visits/${visit.id}`);
  const thumbnails = page.getByRole("list", { name: "Photos of this visit" }).getByRole("button");
  await expect(thumbnails).toHaveCount(2);
  const firstId = await thumbnails.first().getAttribute("data-photo-id");
  const full = await page.request.get(`/photos/${firstId}`);
  expect((await full.body()).includes(Buffer.from("Exif"))).toBe(false);
  const size = await page.evaluate(async (url) => {
    const bitmap = await createImageBitmap(await (await fetch(url)).blob());
    return [bitmap.width, bitmap.height];
  }, `/photos/${firstId}`);
  expect(size).toEqual([2000, 1333]);
});

test("choosing more than 6 keeps 6 and says why", async ({ page }) => {
  await fillVisit(page);
  await choose(page, Array(8).fill(SMALL));
  await expect(chosen(page)).toHaveCount(6);
  await expect(photoField(page).getByRole("alert")).toHaveText("A visit can have at most 6 photos.");
  // Full: the field doesn't offer more.
  await expect(photoField(page).getByLabel("Choose photos")).toHaveCount(0);
});

test("a chosen photo can be removed before saving", async ({ page }) => {
  await fillVisit(page);
  await choose(page, [SMALL, BIG]);
  await photoField(page).getByRole("button", { name: "Remove photo 1" }).click();
  await expect(chosen(page)).toHaveCount(1);
  await page.getByRole("button", { name: "Save visit" }).click();
  await expect(page).toHaveURL("/states/CO", { timeout: 20_000 });
  expect((await savedVisits())[0].photos).toBe(1);
});

test("a file that isn't a photo is refused when chosen, and the others stay", async ({ page }) => {
  await fillVisit(page);
  await choose(page, [SMALL, NOT_A_PHOTO]);
  await expect(chosen(page)).toHaveCount(1);
  await expect(photoField(page).getByRole("alert")).toHaveText("That file isn't a photo.");
});

test("a form error keeps the chosen photos; once fixed, the visit saves with them", async ({ page }) => {
  await fillVisit(page);
  await choose(page, [SMALL, SMALL]);
  // A future date (the field's max is removed, as an older browser might ignore it).
  const date = page.getByLabel("Visit date");
  await date.evaluate((input) => input.removeAttribute("max"));
  await date.fill(daysFromToday(1));
  await page.getByRole("button", { name: "Save visit" }).click();
  await expect(page.getByRole("main").getByRole("alert").first()).toContainText("future");
  expect(await savedVisits()).toEqual([]); // nothing saved, no photos sent
  await expect(chosen(page)).toHaveCount(2);

  await page.getByLabel("Visit date").fill("2024-07-04");
  await page.getByRole("button", { name: "Save visit" }).click();
  await expect(page).toHaveURL("/states/CO", { timeout: 20_000 });
  expect((await savedVisits())[0].photos).toBe(2);
});

test("at the monthly limit, the visit stays saved and the form says which photo failed, with a link to the visit", async ({ page }) => {
  await setUploads(PHOTO_MAX_PER_MONTH - 1); // room for one more
  await fillVisit(page);
  await choose(page, [SMALL, SMALL]);
  await page.getByRole("button", { name: "Save visit" }).click();

  const message = `Visit saved, but photo 2 of 2 couldn't be added: ${photoLimitMessage(uploadMonth(todayIn()))}`;
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(message, { timeout: 20_000 });
  await expect(page).toHaveURL(/\/visits\/new/); // it stays, so the message can be read
  const [visit] = await savedVisits();
  expect(visit.photos).toBe(1);
  await expect(page.getByRole("link", { name: "Open the visit" })).toHaveAttribute("href", `/visits/${visit.id}#photos`);
  // The visit can't be saved a second time from here.
  await expect(page.getByRole("button", { name: "Save visit" })).toHaveCount(0);
  const db = await openTestDatabase();
  expect(await loadVisits(db, userId())).toHaveLength(1);
  db.$client.close();
});

test("on an iPhone (390px) the photo field fits without sideways scrolling, its buttons lined up", async ({ page }, info) => {
  test.skip(info.project.name !== "iphone", "a phone check");
  await fillVisit(page);
  await choose(page, [SMALL, SMALL, SMALL]);
  await expect(chosen(page)).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  // Each chosen photo's row: preview and Remove on one line.
  const row = chosen(page).first();
  await expectCentersLineUp([row.getByRole("img"), row.getByRole("button", { name: "Remove photo 1" })]);
});
