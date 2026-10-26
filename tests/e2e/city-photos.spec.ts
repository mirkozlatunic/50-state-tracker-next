// Slice 27: a visited city's photo in its map pop-up. The photo is the first
// photo (oldest upload) of my most recent visit to that city that has photos,
// shown as its 400 px preview with the date of that visit. It's only loaded
// when the pop-up opens, and a city without photos shows text only.
import { expect, test, type Page } from "@playwright/test";
import { addVisit } from "@/db/queries";
import { logIn, openTestDatabase, resetData, seedPhoto, USER_B_EMAIL, userId } from "./helpers";

const dotButton = (page: Page, label: string) => page.getByRole("button", { name: label, exact: true });
const popUp = (page: Page) => page.getByRole("dialog");

/** Denver: an older visit with a photo, a newer one with two photos, and the
 * newest without any. Grand Junction (far enough from Denver that the two dots don't overlap): a visit without photos. Colorado also has a
 * visit without a city, with a photo. Returns the photo ids. */
async function seed() {
  const db = await openTestDatabase();
  const add = (visitDate: string, city: string | null) => addVisit(db, userId(), { state: "CO", visitDate, note: "", city });
  const older = await seedPhoto(db, await add("2023-05-01", "Denver"), 1);
  const newer = await add("2024-07-04", "Denver");
  const first = await seedPhoto(db, newer, 1);
  const second = await seedPhoto(db, newer, 2);
  await add("2025-03-01", "Denver");
  await add("2024-09-01", "Grand Junction");
  const noCity = await seedPhoto(db, await add("2025-04-01", null), 1);
  db.$client.close();
  return { older, first, second, noCity };
}

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "the map is for bigger screens");
  await resetData();
  await logIn(page);
});

test("a visited city's pop-up shows the first photo of its most recent visit with photos, and that visit's date", async ({ page }) => {
  const photos = await seed();
  await page.goto("/map");
  await dotButton(page, "Denver, CO").hover();
  const image = popUp(page).getByRole("img", { name: "Photo from the visit to Denver, Colorado on 2024-07-04" });
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute("src", `/photos/${photos.first}?size=thumb`);
  // The picture really loaded (the photo route sent it to its owner).
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(popUp(page)).toContainText("Photo: visit on 2024-07-04");
  // The text is still there, below the photo.
  await expect(popUp(page)).toContainText("visited 2023-05-01, 2024-07-04, 2025-03-01");
  await expect(popUp(page).getByRole("link", { name: "Open Colorado →" })).toBeVisible();
});

test("the photo is only loaded when the pop-up opens, not with the map", async ({ page }) => {
  const photos = await seed();
  const requested: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/photos/")) requested.push(url.pathname + url.search);
  });
  await page.goto("/map");
  await expect(dotButton(page, "Denver, CO")).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(requested).toEqual([]);
  await expect(page.locator('img[src^="/photos/"]')).toHaveCount(0);

  await dotButton(page, "Denver, CO").click();
  await expect(popUp(page).getByRole("img")).toBeVisible();
  expect(requested).toEqual([`/photos/${photos.first}?size=thumb`]);
});

test("a tap opens it too, at iPad width (820px)", async ({ page }) => {
  await seed();
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/map");
  await dotButton(page, "Denver, CO").click();
  await expect(popUp(page).getByRole("img", { name: /Denver, Colorado/ })).toBeVisible();
});

test("a city without photos shows text only, as before", async ({ page }) => {
  await seed();
  await page.goto("/map");
  await dotButton(page, "Grand Junction, CO").hover();
  await expect(popUp(page)).toContainText("Grand Junction, CO · visited 2024-09-01");
  await expect(popUp(page).getByRole("img")).toHaveCount(0);
  await expect(popUp(page)).not.toContainText("Photo:");
});

test("a photo of a visit without a city never shows on any dot", async ({ page }) => {
  const photos = await seed();
  await page.goto("/map");
  for (const label of ["Denver, CO", "Grand Junction, CO"]) {
    await dotButton(page, label).click();
    await expect(popUp(page)).toBeVisible();
    await expect(popUp(page).locator(`img[src^="/photos/${photos.noCity}?"]`)).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(popUp(page)).toHaveCount(0); // closed (and faded out) before the next one opens
  }
});

test("someone else's photos never appear on my map", async ({ browser }) => {
  await seed(); // test person A's visits and photos
  // Test person B has visited Denver too, without photos.
  const db = await openTestDatabase();
  await addVisit(db, userId("B"), { state: "CO", visitDate: "2024-10-10", note: "", city: "Denver" });
  db.$client.close();

  const other = await (await browser.newContext()).newPage();
  await logIn(other, "/map", USER_B_EMAIL);
  // Nowhere in the page as it's sent, nor in the open pop-up.
  expect(await (await other.request.get("/map")).text()).not.toContain("/photos/");
  await dotButton(other, "Denver, CO").hover();
  await expect(popUp(other)).toContainText("visited 2024-10-10");
  await expect(popUp(other).getByRole("img")).toHaveCount(0);
});
