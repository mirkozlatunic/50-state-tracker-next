// Slice 0: the app starts and shows its name, styled with shadcn.
import { expect, test } from "@playwright/test";
import { logIn } from "./helpers";

test.beforeEach(async ({ page }) => {
  await logIn(page);
});

test("every page carries the app's name", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/50 States Tracker$/);
  await expect(page.getByRole("banner").getByRole("link", { name: "50 States Tracker" })).toBeVisible();
});

test("the page is in English", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("a shadcn button is on the page", async ({ page }) => {
  await page.goto("/");
  // shadcn buttons carry data-slot="button".
  await expect(page.locator('[data-slot="button"]').first()).toBeVisible();
});

test("text uses the Geist font, not the browser's default serif font", async ({ page }) => {
  await page.goto("/");
  const font = await page.locator("body").evaluate((body) => getComputedStyle(body).fontFamily);
  expect(font).toMatch(/Geist/);
});
