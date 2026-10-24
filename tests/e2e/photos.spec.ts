// Slice 18: up to 6 photos per visit, on its visit page. The browser shrinks
// each photo (at most 2000 px, which also drops its location data) and makes
// a small preview; only the visit's owner can add, see or delete them.
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { addVisit } from "@/db/queries";
import { logIn, openTestDatabase, resetData, USER_B_EMAIL, userId } from "./helpers";

const FIXTURES = join(__dirname, "fixtures");
const BIG = join(FIXTURES, "big-photo.jpg"); // 2400 x 1600, with an Exif block
const SMALL = join(FIXTURES, "small-photo.jpg");
const NOT_A_PHOTO = join(FIXTURES, "not-a-photo.jpg"); // text, named .jpg

/** A visit of test person A; returns its id. */
async function saveVisit() {
  const db = await openTestDatabase();
  const id = await addVisit(db, userId(), { state: "CO", visitDate: "2024-07-04", note: "Red Rocks", city: "Denver" });
  db.$client.close();
  return id;
}

const photos = (page: Page) => page.getByRole("region", { name: "Photos" });
const thumbnails = (page: Page) => photos(page).getByRole("list", { name: "Photos of this visit" }).getByRole("button");

/** Choose files in "Add photos" and wait until the gallery shows `count` photos. */
async function addPhotos(page: Page, files: string[], count: number) {
  await photos(page).getByLabel("Add photos").setInputFiles(files);
  await expect(thumbnails(page)).toHaveCount(count, { timeout: 15_000 });
}

/** The ids of the photos in the gallery, in order. */
const photoIds = (page: Page) => thumbnails(page).evaluateAll((buttons) => buttons.map((b) => b.getAttribute("data-photo-id")));

test.beforeEach(async ({ page }) => {
  await resetData();
  await logIn(page);
});

test("a visit without photos says so and offers to add some", async ({ page }) => {
  const id = await saveVisit();
  await page.goto(`/visits/${id}`);
  await expect(photos(page).getByText("No photos yet.")).toBeVisible();
  await expect(photos(page).getByLabel("Add photos")).toHaveAttribute("accept", "image/*");
});

test("an added photo is shrunk to at most 2000 px, as a JPEG without its Exif (location) data", async ({ page }) => {
  const id = await saveVisit();
  await page.goto(`/visits/${id}`);
  await addPhotos(page, [BIG], 1);
  const [photoId] = await photoIds(page);
  // The full photo, as the browser gets it from /photos/<id>.
  const full = await page.request.get(`/photos/${photoId}`);
  expect(full.status()).toBe(200);
  expect(full.headers()["content-type"]).toBe("image/jpeg");
  expect(full.headers()["cache-control"]).toContain("private");
  const bytes = await full.body();
  expect(bytes.includes(Buffer.from("Exif"))).toBe(false);
  const size = await page.evaluate(async (url) => {
    const bitmap = await createImageBitmap(await (await fetch(url)).blob());
    return [bitmap.width, bitmap.height];
  }, `/photos/${photoId}`);
  expect(size).toEqual([2000, 1333]);
  // The preview is much smaller.
  const thumb = await page.request.get(`/photos/${photoId}?size=thumb`);
  expect(thumb.status()).toBe(200);
  expect((await thumb.body()).length).toBeLessThan(bytes.length / 4);
});

test("several photos at once; they stay after a reload", async ({ page }) => {
  const id = await saveVisit();
  await page.goto(`/visits/${id}`);
  await addPhotos(page, [BIG, SMALL, SMALL], 3);
  await page.reload();
  await expect(thumbnails(page)).toHaveCount(3);
});

test("a visit can have at most 6 photos", async ({ page }) => {
  const id = await saveVisit();
  await page.goto(`/visits/${id}`);
  await addPhotos(page, Array(7).fill(SMALL), 6);
  await expect(photos(page).getByRole("alert")).toHaveText("A visit can have at most 6 photos.");
  await page.reload();
  await expect(thumbnails(page)).toHaveCount(6);
  await expect(photos(page).getByLabel("Add photos")).toHaveCount(0);
  await expect(photos(page).getByText("6 of 6 photos")).toBeVisible();
});

test("a file that isn't a photo is refused", async ({ page }) => {
  const id = await saveVisit();
  await page.goto(`/visits/${id}`);
  await photos(page).getByLabel("Add photos").setInputFiles([NOT_A_PHOTO]);
  await expect(photos(page).getByRole("alert")).toHaveText("That file isn't a photo.");
  await expect(photos(page).getByText("No photos yet.")).toBeVisible();
});

test("the server refuses a file that isn't a photo, even when sent directly", async ({ page }) => {
  const id = await saveVisit();
  const text = { name: "x.jpg", mimeType: "image/jpeg", buffer: Buffer.from("not a photo") };
  const response = await page.request.post(`/api/visits/${id}/photos`, {
    multipart: { full: text, thumb: text, width: "10", height: "10" },
  });
  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({ error: "That file isn't a photo." });
});

test("a photo opens big, and can be deleted (its file too)", async ({ page }) => {
  const id = await saveVisit();
  await page.goto(`/visits/${id}`);
  await addPhotos(page, [SMALL, SMALL], 2);
  const [first] = await photoIds(page);
  await thumbnails(page).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("img", { name: "Photo 1 of 2" })).toBeVisible();
  await dialog.getByRole("button", { name: "Delete photo" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(thumbnails(page)).toHaveCount(1);
  expect((await page.request.get(`/photos/${first}`)).status()).toBe(404);
});

test("deleting a visit deletes its photos", async ({ page }) => {
  const id = await saveVisit();
  await page.goto(`/visits/${id}`);
  await addPhotos(page, [SMALL], 1);
  const [photoId] = await photoIds(page);
  await page.getByRole("button", { name: "Delete", exact: true }).first().click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL("/states/CO");
  expect((await page.request.get(`/photos/${photoId}`)).status()).toBe(404);
});

test("the state page shows how many photos a visit has", async ({ page }) => {
  const id = await saveVisit();
  await page.goto(`/visits/${id}`);
  await addPhotos(page, [SMALL, SMALL], 2);
  await page.goto("/states/CO");
  await expect(page.getByRole("list", { name: "Visits" }).getByText("2 photos")).toBeVisible();
});

test("someone else can't see my photos or add photos to my visit", async ({ page, browser }) => {
  const id = await saveVisit();
  await page.goto(`/visits/${id}`);
  await addPhotos(page, [SMALL], 1);
  const [photoId] = await photoIds(page);
  const other = await (await browser.newContext()).newPage();
  await logIn(other, "/", USER_B_EMAIL);
  expect((await other.request.get(`/photos/${photoId}`)).status()).toBe(404);
  expect((await other.request.get(`/photos/${photoId}?size=thumb`)).status()).toBe(404);
  const photo = { name: "x.jpg", mimeType: "image/jpeg", buffer: await (await page.request.get(`/photos/${photoId}`)).body() };
  const upload = await other.request.post(`/api/visits/${id}/photos`, {
    multipart: { full: photo, thumb: photo, width: "10", height: "10" },
  });
  expect(upload.status()).toBe(404);
});

test("signed out, photos aren't shown", async ({ page, browser }) => {
  const id = await saveVisit();
  await page.goto(`/visits/${id}`);
  await addPhotos(page, [SMALL], 1);
  const [photoId] = await photoIds(page);
  const stranger = await browser.newContext();
  const response = await stranger.request.get(`/photos/${photoId}`, { maxRedirects: 0 });
  expect(response.status()).not.toBe(200);
});

test("the photos fit an iPhone (390px) without sideways scrolling", async ({ page }) => {
  const id = await saveVisit();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/visits/${id}`);
  await addPhotos(page, Array(6).fill(SMALL), 6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
