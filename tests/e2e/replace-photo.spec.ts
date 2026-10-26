// Slice 31: "Replace photo" in a photo's pop-up on the visit page. The new
// file is shrunk like any upload and takes the old photo's place (same spot in
// the list, still the city's photo); the old files are deleted. It counts as
// one upload towards the month's 50. If it can't be done, the old photo stays.
// A replaced photo gets a new address (its version, v=...), so no browser
// shows an old copy.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { addVisit, countPhotoUpload, photoUploadsIn } from "@/db/queries";
import { todayIn } from "@/lib/dates";
import { PHOTO_MAX_PER_MONTH, photoLimitMessage, uploadMonth } from "@/lib/photos";
import { logIn, openTestDatabase, resetData, seedPhoto, TEST_PHOTO_DIR, USER_B_EMAIL, userId } from "./helpers";
import { expectCentersLineUp } from "./layout-helpers";

const FIXTURES = join(__dirname, "fixtures");
const BIG = join(FIXTURES, "big-photo.jpg"); // 2400 x 1600: stored as 2000 x 1333
const NOT_A_PHOTO = join(FIXTURES, "not-a-photo.jpg");
const thisMonth = () => uploadMonth(todayIn());

/** A Denver visit of test person A with 2 (small) photos. Returns the ids. */
async function seed() {
  const db = await openTestDatabase();
  const visitId = await addVisit(db, userId(), { state: "CO", visitDate: "2024-07-04", note: "", city: "Denver" });
  const first = await seedPhoto(db, visitId, 1);
  const second = await seedPhoto(db, visitId, 2);
  db.$client.close();
  return { visitId, first, second };
}

const thumbnails = (page: Page) => page.getByRole("list", { name: "Photos of this visit" }).getByRole("button");
const photoIds = (page: Page) => thumbnails(page).evaluateAll((buttons) => buttons.map((b) => Number(b.getAttribute("data-photo-id"))));
const popUp = (page: Page) => page.getByRole("dialog");
/** The first thumbnail's picture address. */
const firstThumbSrc = (page: Page) => thumbnails(page).first().locator("img").getAttribute("src");

/** Open photo 1's pop-up on the visit page. */
async function openFirstPhoto(page: Page, visitId: number) {
  await page.goto(`/visits/${visitId}`);
  await page.getByRole("button", { name: "Open photo 1 of 2" }).click();
  await expect(popUp(page)).toBeVisible();
}

/** The stored size of a photo, as the browser gets it. */
const sizeOf = (page: Page, photoId: number) =>
  page.evaluate(async (url) => {
    const bitmap = await createImageBitmap(await (await fetch(url)).blob());
    return [bitmap.width, bitmap.height];
  }, `/photos/${photoId}`);

/** How many photos test person A has uploaded this month. */
async function uploads() {
  const db = await openTestDatabase();
  const count = await photoUploadsIn(db, userId(), thisMonth());
  db.$client.close();
  return count;
}

test.beforeEach(async ({ page }) => {
  await resetData();
  await logIn(page);
});

test("the pop-up has Replace photo next to Delete photo, lined up", async ({ page }) => {
  const { visitId } = await seed();
  await openFirstPhoto(page, visitId);
  const replace = popUp(page).getByText("Replace photo");
  const remove = popUp(page).getByRole("button", { name: "Delete photo" });
  await expect(replace).toHaveAttribute("data-slot", "button");
  await expect(popUp(page).getByLabel("Replace photo")).toHaveAttribute("accept", "image/*");
  await expectCentersLineUp([replace, remove]);
});

test("replacing puts the new photo in the old one's place, with a new address, and deletes the old files", async ({ page }) => {
  const { visitId, first, second } = await seed();
  await page.goto(`/visits/${visitId}`);
  const oldSrc = await firstThumbSrc(page); // read before the pop-up hides the page behind it
  await openFirstPhoto(page, visitId);
  await popUp(page).getByLabel("Replace photo").setInputFiles(BIG);

  // The pop-up shows the new picture (shrunk to 2000 px), at a new address.
  const big = popUp(page).getByRole("img");
  await expect.poll(() => big.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth), { timeout: 15_000 }).toBe(2000);
  await expect(big).toHaveAttribute("src", new RegExp(`^/photos/${first}\\?v=[a-z0-9]+$`));
  await page.keyboard.press("Escape");

  // Same photos, same order, same count; the first one's address changed.
  expect(await photoIds(page)).toEqual([first, second]);
  await expect(page.getByText("2 of 6 photos")).toBeVisible();
  expect(await firstThumbSrc(page)).not.toBe(oldSrc);
  expect(await sizeOf(page, first)).toEqual([2000, 1333]);
  // seedPhoto's old files are gone; the second photo's files are still there.
  expect(existsSync(join(TEST_PHOTO_DIR, `photos/e2e-A/full-${visitId}-1.jpg`))).toBe(false);
  expect(existsSync(join(TEST_PHOTO_DIR, `photos/e2e-A/thumb-${visitId}-1.jpg`))).toBe(false);
  expect(existsSync(join(TEST_PHOTO_DIR, `photos/e2e-A/full-${visitId}-2.jpg`))).toBe(true);
  // It counted as one upload.
  expect(await uploads()).toBe(1);

  // After a reload too: still the new picture.
  await page.reload();
  expect(await photoIds(page)).toEqual([first, second]);
  expect(await sizeOf(page, first)).toEqual([2000, 1333]);
});

test("a replaced first photo is still the city's photo on the map, at its new address", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "the map is for bigger screens");
  const { visitId, first } = await seed();
  await openFirstPhoto(page, visitId);
  await popUp(page).getByLabel("Replace photo").setInputFiles(BIG);
  await expect.poll(() => popUp(page).getByRole("img").evaluate((img: HTMLImageElement) => img.naturalWidth), { timeout: 15_000 }).toBe(2000);
  const newVersion = new URL(String(await popUp(page).getByRole("img").getAttribute("src")), "http://x").searchParams.get("v");

  await page.goto("/map");
  await page.getByRole("button", { name: "Denver, CO", exact: true }).hover();
  await expect(page.getByRole("dialog").getByRole("img")).toHaveAttribute("src", `/photos/${first}?size=thumb&v=${newVersion}`);
});

test("a file that isn't a photo is refused, and the old photo stays", async ({ page }) => {
  const { visitId, first } = await seed();
  await openFirstPhoto(page, visitId);
  const oldSrc = await popUp(page).getByRole("img").getAttribute("src");
  await popUp(page).getByLabel("Replace photo").setInputFiles(NOT_A_PHOTO);
  await expect(popUp(page).getByRole("alert")).toHaveText("That file isn't a photo.");
  await expect(popUp(page).getByRole("img")).toHaveAttribute("src", String(oldSrc));
  expect(existsSync(join(TEST_PHOTO_DIR, `photos/e2e-A/full-${visitId}-1.jpg`))).toBe(true);
  expect(await uploads()).toBe(0);
  expect((await page.request.get(`/photos/${first}`)).status()).toBe(200);
});

test("at the monthly limit it's refused with the limit message, and the old photo stays", async ({ page }) => {
  const db = await openTestDatabase();
  for (let i = 0; i < PHOTO_MAX_PER_MONTH; i++) await countPhotoUpload(db, userId(), thisMonth());
  db.$client.close();
  const { visitId } = await seed();
  await openFirstPhoto(page, visitId);
  const oldSrc = await popUp(page).getByRole("img").getAttribute("src");
  await popUp(page).getByLabel("Replace photo").setInputFiles(BIG);
  await expect(popUp(page).getByRole("alert")).toHaveText(photoLimitMessage(thisMonth()));
  await expect(popUp(page).getByRole("img")).toHaveAttribute("src", String(oldSrc));
  expect(existsSync(join(TEST_PHOTO_DIR, `photos/e2e-A/full-${visitId}-1.jpg`))).toBe(true);
  expect(await uploads()).toBe(PHOTO_MAX_PER_MONTH);
});

test("someone else can't replace my photo (404), and it stays as it was", async ({ page, browser }) => {
  const { visitId, first } = await seed();
  const other = await (await browser.newContext()).newPage();
  await logIn(other, "/", USER_B_EMAIL);
  const photo = { name: "x.jpg", mimeType: "image/jpeg", buffer: readFileSync(BIG) };
  const response = await other.request.put(`/api/photos/${first}`, {
    multipart: { full: photo, thumb: photo, width: "10", height: "10" },
  });
  expect(response.status()).toBe(404);
  // My photo still has its old file, and nothing counted as an upload.
  expect(existsSync(join(TEST_PHOTO_DIR, `photos/e2e-A/full-${visitId}-1.jpg`))).toBe(true);
  expect((await page.request.get(`/photos/${first}`)).status()).toBe(200);
  expect(await uploads()).toBe(0);
});
