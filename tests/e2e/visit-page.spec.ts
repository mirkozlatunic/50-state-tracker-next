// Slice 17: every visit has its own page (/visits/<id>) with its details and a
// story: a longer, optional text written afterwards. The quick add-visit form
// stays as short as it was.
import { expect, test, type Page } from "@playwright/test";
import { addVisit, setVisitStory } from "@/db/queries";
import { logIn, openTestDatabase, resetData, USER_B_EMAIL, userId } from "./helpers";

/** Save a visit for test person A (optionally with a story); returns its id. */
async function saveVisit({ story = "" }: { story?: string } = {}) {
  const db = await openTestDatabase();
  const id = await addVisit(db, userId(), { state: "CO", visitDate: "2024-07-04", note: "Red Rocks", city: "Denver" });
  if (story) await setVisitStory(db, userId(), id, story);
  db.$client.close();
  return id;
}

const storySection = (page: Page) => page.getByRole("region", { name: "Story" });

test.beforeEach(async ({ page }) => {
  await resetData();
  await logIn(page);
});

test("a visit on the state page links to its own page, which shows its details", async ({ page }) => {
  const id = await saveVisit();
  await page.goto("/states/CO");
  await page.getByRole("list", { name: "Visits" }).getByRole("link", { name: "2024-07-04" }).click();
  await expect(page).toHaveURL(`/visits/${id}`);
  await expect(page).toHaveTitle("Visit · 50 States Tracker");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Visit to Colorado");
  await expect(page.getByText("2024-07-04 · Denver", { exact: true })).toBeVisible();
  await expect(page.getByText("Red Rocks", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "← Colorado" })).toHaveAttribute("href", "/states/CO");
});

test("a visit without a story says so and offers to write one", async ({ page }) => {
  const id = await saveVisit();
  await page.goto(`/visits/${id}`);
  await expect(storySection(page).getByText("No story yet.")).toBeVisible();
  await expect(storySection(page).getByRole("button", { name: "Write the story" })).toBeVisible();
});

test("writing a story saves it, keeps its line breaks, and it stays after a reload", async ({ page }) => {
  const id = await saveVisit();
  await page.goto(`/visits/${id}`);
  await storySection(page).getByRole("button", { name: "Write the story" }).click();
  await storySection(page).getByLabel("Story").fill("Day one: Red Rocks.\n\nDay two: Boulder.");
  await storySection(page).getByRole("button", { name: "Save story" }).click();
  const text = storySection(page).getByTestId("story-text");
  await expect(text).toBeVisible();
  expect(await text.innerText()).toBe("Day one: Red Rocks.\n\nDay two: Boulder.");
  await expect(storySection(page).getByRole("button", { name: "Edit the story" })).toBeVisible();
  await page.reload();
  expect(await storySection(page).getByTestId("story-text").innerText()).toBe("Day one: Red Rocks.\n\nDay two: Boulder.");
});

test("editing starts from the saved story; clearing it removes it", async ({ page }) => {
  const id = await saveVisit({ story: "Old story" });
  await page.goto(`/visits/${id}`);
  await storySection(page).getByRole("button", { name: "Edit the story" }).click();
  await expect(storySection(page).getByLabel("Story")).toHaveValue("Old story");
  await storySection(page).getByLabel("Story").fill("");
  await storySection(page).getByRole("button", { name: "Save story" }).click();
  await expect(storySection(page).getByText("No story yet.")).toBeVisible();
});

test("Cancel leaves the story as it was", async ({ page }) => {
  const id = await saveVisit({ story: "Keep me" });
  await page.goto(`/visits/${id}`);
  await storySection(page).getByRole("button", { name: "Edit the story" }).click();
  await storySection(page).getByLabel("Story").fill("Throw this away");
  await storySection(page).getByRole("button", { name: "Cancel" }).click();
  expect(await storySection(page).getByTestId("story-text").innerText()).toBe("Keep me");
});

test("the form counts the characters, and a story that's too long is refused without losing it", async ({ page }) => {
  const id = await saveVisit();
  await page.goto(`/visits/${id}`);
  await storySection(page).getByRole("button", { name: "Write the story" }).click();
  const field = storySection(page).getByLabel("Story");
  await field.fill("Hello");
  await expect(storySection(page).getByText("5 / 5,000")).toBeVisible();
  const long = "a".repeat(5001);
  await field.fill(long);
  await expect(storySection(page).getByText("5,001 / 5,000")).toBeVisible();
  await storySection(page).getByRole("button", { name: "Save story" }).click();
  await expect(storySection(page).getByRole("alert")).toHaveText("A story can be at most 5,000 characters (this one has 5,001).");
  await expect(field).toHaveValue(long);
});

test("Edit and Delete are on the visit page; deleting goes back to the state", async ({ page }) => {
  const id = await saveVisit();
  await page.goto(`/visits/${id}`);
  await expect(page.getByRole("link", { name: "Edit" })).toHaveAttribute("href", `/visits/${id}/edit`);
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL("/states/CO");
  await expect(page.getByText("No visits yet.")).toBeVisible();
});

test("someone else's visit page is not found, and its story isn't shown", async ({ browser }) => {
  const id = await saveVisit({ story: "Private story" });
  const other = await (await browser.newContext()).newPage();
  await logIn(other, `/visits/${id}`, USER_B_EMAIL);
  await expect(other.getByRole("heading", { name: "Not found" })).toBeVisible();
  await expect(other.getByText("Private story")).toHaveCount(0);
});

test("an unknown visit is not found", async ({ page }) => {
  await page.goto("/visits/999999");
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
});

test("the visit page fits an iPhone (390px) without sideways scrolling", async ({ page }) => {
  const id = await saveVisit({ story: "A long day. ".repeat(80) });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/visits/${id}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
