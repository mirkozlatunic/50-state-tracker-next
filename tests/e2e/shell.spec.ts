// Slice 3: the app shell — header, nav, counter, light/dark switch and footer,
// on desktop and iPhone, with the buttons measured to line up.
import { expect, test, type Page } from "@playwright/test";
import { logIn, TEST_DB_URL } from "./helpers";
import { expectAtLeastTall, expectCentersLineUp, expectContentCentered } from "./layout-helpers";
import { openDatabase, setupDatabase } from "@/db";
import { visitedStateCount } from "@/db/queries";

const NAV = [
  ["States", "/states"],
  ["Map", "/map"],
  ["Add visit", "/visits/new"],
  ["Trips", "/trips"],
  ["Years", "/years"],
] as const;

const header = (page: Page) => page.getByRole("banner");
const nav = (page: Page) => page.getByRole("navigation", { name: "Main" });
const themeButton = (page: Page) => page.getByRole("button", { name: "Switch between light and dark mode" });
const counter = (page: Page) => header(page).getByText(/^\d+ of 50$/);

test.beforeEach(async ({ page }) => {
  await logIn(page);
});

test.describe("the header", () => {
  test("has the app's name, linking home", async ({ page }) => {
    await expect(header(page).getByRole("link", { name: "50 States Tracker" })).toHaveAttribute("href", "/");
  });

  test("the nav links to every part of the app, in order", async ({ page }) => {
    const links = nav(page).getByRole("link");
    await expect(links).toHaveText(NAV.map(([name]) => name));
    for (const [name, href] of NAV) await expect(nav(page).getByRole("link", { name })).toHaveAttribute("href", href);
  });

  test("the counter shows the visited states from the database", async ({ page }) => {
    const db = openDatabase({ url: TEST_DB_URL });
    await setupDatabase(db);
    const count = await visitedStateCount(db);
    db.$client.close();
    await expect(counter(page)).toHaveText(`${count} of 50`);
  });

  test("the nav items are shadcn buttons of one size", async ({ page }) => {
    const items = await nav(page).getByRole("link").all();
    const heights = await Promise.all(items.map(async (item) => (await item.boundingBox())?.height));
    expect(new Set(heights).size).toBe(1);
    for (const item of items) await expect(item).toHaveAttribute("data-slot", "button");
  });
});

test.describe("the footer", () => {
  test("has Download backup and Log out, lined up", async ({ page }) => {
    const footer = page.getByRole("contentinfo");
    const backup = footer.getByRole("link", { name: "Download backup" });
    const logOut = footer.getByRole("button", { name: "Log out" });
    await expect(backup).toHaveAttribute("href", "/backup");
    await expectCentersLineUp([backup, logOut]);
  });
});

test("logged out, the login page shows no header nav, counter or footer", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/login");
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
  await expect(page.getByText(/^\d+ of 50$/)).toHaveCount(0);
  await expect(page.getByRole("contentinfo")).toHaveCount(0);
});

test.describe("light and dark", () => {
  test("the switch is an icon button with its icon in the middle", async ({ page }) => {
    await expect(themeButton(page)).toHaveAttribute("data-slot", "button");
    await expectContentCentered(themeButton(page), themeButton(page).locator("svg:visible"));
  });

  test("the switch changes the theme, and the choice stays after a reload", async ({ page }) => {
    const html = page.locator("html");
    const startedDark = ((await html.getAttribute("class")) ?? "").includes("dark");
    await themeButton(page).click();
    await expect(html).toHaveClass(startedDark ? /^(?!.*\bdark\b)/ : /\bdark\b/);
    await page.reload();
    await expect(html).toHaveClass(startedDark ? /^(?!.*\bdark\b)/ : /\bdark\b/);
  });

  test("dark mode really changes the colors", async ({ page }) => {
    const background = () => page.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor);
    const before = await background();
    await themeButton(page).click();
    await expect.poll(background).not.toBe(before);
  });

  test("without a saved choice, the page follows the device's setting", async ({ browser }) => {
    for (const colorScheme of ["dark", "light"] as const) {
      const page = await (await browser.newContext({ colorScheme })).newPage();
      await logIn(page);
      const html = page.locator("html");
      if (colorScheme === "dark") await expect(html).toHaveClass(/\bdark\b/);
      else await expect(html).not.toHaveClass(/\bdark\b/);
    }
  });

  test("the phone's top bar color matches the page in each theme", async ({ page }) => {
    await expect(page.locator('meta[name="theme-color"][media="(prefers-color-scheme: light)"]')).toHaveCount(1);
    await expect(page.locator('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]')).toHaveCount(1);
  });
});

test.describe("layout", () => {
  test("on a computer, the brand, nav, counter and switch sit on one line", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "computer layout");
    const brand = header(page).getByRole("link", { name: "50 States Tracker" });
    await expectCentersLineUp([brand, ...(await nav(page).getByRole("link").all()), counter(page), themeButton(page)]);
  });

  test("on a phone, the brand, counter and switch are one line, with the nav below", async ({ page }, info) => {
    test.skip(info.project.name !== "iphone", "phone layout");
    const brand = header(page).getByRole("link", { name: "50 States Tracker" });
    await expectCentersLineUp([brand, counter(page), themeButton(page)]);
    const navItems = await nav(page).getByRole("link").all();
    await expectCentersLineUp(navItems);
    const brandBox = await brand.boundingBox();
    const navBox = await nav(page).boundingBox();
    expect(navBox!.y).toBeGreaterThan(brandBox!.y + brandBox!.height);
  });

  test("on a phone, header and footer buttons are big enough for a finger", async ({ page }, info) => {
    test.skip(info.project.name !== "iphone", "touch screens");
    const footer = page.getByRole("contentinfo");
    await expectAtLeastTall(
      [
        ...(await nav(page).getByRole("link").all()),
        themeButton(page),
        footer.getByRole("link", { name: "Download backup" }),
        footer.getByRole("button", { name: "Log out" }),
      ],
      44,
    );
  });

  for (const [device, width] of [["iPhone", 390], ["iPad", 820]] as const) {
    test(`fits an ${device} (${width}px) without sideways scrolling`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(width);
    });
  }
});
