// Slice 3: the app shell — header, nav, counter and light/dark switch, on
// desktop and iPhone, with the buttons measured to line up.
// Slice 11: the header is a fixed pill that stays on screen while scrolling,
// and Download backup and Log out moved from the footer into its menu.
import { expect, test, type Page } from "@playwright/test";
import { expectCurrentPage, logIn, openNavMenu, openTestDatabase, userId } from "./helpers";
import { expectAtLeastTall, expectCentersLineUp, expectContentCentered } from "./layout-helpers";
import { visitedStateCount } from "@/db/queries";

// Slice 21: the map comes first.
const NAV = [
  ["Map", "/map"],
  ["States", "/states"],
  ["Add visit", "/visits/new"],
  ["Trips", "/trips"],
  ["Years", "/years"],
] as const;

const header = (page: Page) => page.getByRole("banner");
const nav = (page: Page) => page.getByRole("navigation", { name: "Main" });
const themeButton = (page: Page) => page.getByRole("button", { name: "Switch between light and dark mode" });
const counter = (page: Page) => header(page).getByText(/^\d+ of 50$/);
const menuButton = (page: Page) => header(page).getByRole("button", { name: /^(Account|Menu)$/ });
const isPhone = (projectName: string) => projectName === "iphone";

test.beforeEach(async ({ page }) => {
  await logIn(page);
});

test.describe("the header", () => {
  test("has the app's name, linking to the map", async ({ page }) => {
    await expect(header(page).getByRole("link", { name: "50 States Tracker" })).toHaveAttribute("href", "/map");
  });

  test("shows the badge logo, loaded and cut to a circle", async ({ page }) => {
    const logo = header(page).getByRole("link", { name: "50 States Tracker" }).locator("img");
    await expect(logo).toHaveCount(1);
    await expect(logo).toHaveAttribute("src", /logo/);
    await expect.poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    const box = (await logo.boundingBox())!;
    expect(box.width).toBe(box.height);
    expect(await logo.evaluate((img) => getComputedStyle(img).borderRadius)).toMatch(/^(50%|\d{3,}px)$/);
  });

  test("on a computer, the nav links to every part of the app, in order", async ({ page }, info) => {
    test.skip(isPhone(info.project.name), "computer layout");
    const links = nav(page).getByRole("link");
    await expect(links).toHaveText(NAV.map(([name]) => name));
    for (const [name, href] of NAV) await expect(nav(page).getByRole("link", { name })).toHaveAttribute("href", href);
  });

  test("on a phone, the menu lists every part of the app, then sharing, backup, account and log out", async ({ page }, info) => {
    test.skip(!isPhone(info.project.name), "phone layout");
    await openNavMenu(page);
    await expect(page.getByRole("menuitem")).toHaveText([...NAV.map(([name]) => name), "Share my map", "Download backup", "Manage account", "Log out"]);
    await page.getByRole("menuitem", { name: "Trips" }).click();
    await expect(page).toHaveURL("/trips");
    await expectCurrentPage(page, "Trips");
  });

  test("the counter shows the visited states from the database", async ({ page }) => {
    const db = await openTestDatabase();
    const count = await visitedStateCount(db, userId());
    db.$client.close();
    await expect(counter(page)).toHaveText(`${count} of 50`);
  });

  test("the nav items are shadcn buttons of one size", async ({ page }, info) => {
    test.skip(isPhone(info.project.name), "the phone's nav is in the menu");
    const items = await nav(page).getByRole("link").all();
    const heights = await Promise.all(items.map(async (item) => (await item.boundingBox())?.height));
    expect(new Set(heights).size).toBe(1);
    for (const item of items) await expect(item).toHaveAttribute("data-slot", "button");
  });
});

test.describe("the menu at the top", () => {
  test("has Download backup, Manage account and Log out", async ({ page }) => {
    await openNavMenu(page);
    await expect(page.getByRole("menuitem", { name: "Download backup" })).toHaveAttribute("href", "/backup");
    await expect(page.getByRole("menuitem", { name: "Manage account" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Log out" })).toBeVisible();
  });

  test("there's no footer any more", async ({ page }) => {
    await expect(page.getByRole("contentinfo")).toHaveCount(0);
  });
});

/** Open the states list and scroll down until the header shrinks. On a slow
 * machine the first scroll can come before the page is ready to notice it, so
 * it starts again from the top until it works. */
async function scrollDownUntilShrunk(page: Page) {
  await page.goto("/states");
  await expect(page.getByRole("link", { name: "Wyoming" })).toBeVisible(); // the list has loaded
  await expect(async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.mouse.wheel(0, 1500);
    await expect(header(page).getByRole("button", { name: "Show navigation" })).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 20_000 });
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
}

test.describe("the header stays on screen", () => {
  // A short window, so every page has room to scroll.
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: page.viewportSize()!.width, height: 500 });
  });

  test("it doesn't cover the page's title", async ({ page }) => {
    await page.goto("/states");
    const pill = await header(page).boundingBox();
    const title = await page.getByRole("heading", { level: 1 }).boundingBox();
    expect(title!.y).toBeGreaterThanOrEqual(pill!.y + pill!.height);
  });

  test("after scrolling down it's still at the top, and a tap opens it again", async ({ page }, info) => {
    await scrollDownUntilShrunk(page);
    // Scrolled down, it shrinks to a round button that's still on screen.
    const collapsed = header(page).getByRole("button", { name: "Show navigation" });
    await expect(collapsed).toBeInViewport();
    await collapsed.click();
    if (isPhone(info.project.name)) {
      await openNavMenu(page);
      await page.getByRole("menuitem", { name: "Trips" }).click();
    } else {
      await nav(page).getByRole("link", { name: "Trips" }).click();
    }
    await expect(page).toHaveURL("/trips");
  });

  test("scrolling back up opens it again by itself", async ({ page }) => {
    await scrollDownUntilShrunk(page);
    await page.mouse.wheel(0, -400);
    await expect(header(page).getByRole("button", { name: "Show navigation" })).toHaveCount(0);
    await expect(menuButton(page)).toBeInViewport();
  });
});

test("signed out, the sign-in page shows no header nav, counter or menu", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/sign-in");
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
  await expect(page.getByText(/^\d+ of 50$/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^(Account|Menu)$/ })).toHaveCount(0);
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
    // The warm off-white page and the dark theme's navy background.
    await expect(page.locator('meta[name="theme-color"][media="(prefers-color-scheme: light)"]')).toHaveAttribute("content", "#FBFAF7");
    await expect(page.locator('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]')).toHaveAttribute("content", "#101C25");
  });
});

test.describe("layout", () => {
  test("on a computer, the brand, nav, counter, switch and menu sit on one line", async ({ page }, info) => {
    test.skip(isPhone(info.project.name), "computer layout");
    const brand = header(page).getByRole("link", { name: "50 States Tracker" });
    await expectCentersLineUp([
      brand,
      ...(await nav(page).getByRole("link").all()),
      counter(page),
      themeButton(page),
      menuButton(page),
    ]);
  });

  test("on a phone, the brand, counter, switch and menu button sit on one line", async ({ page }, info) => {
    test.skip(!isPhone(info.project.name), "phone layout");
    const brand = header(page).getByRole("link", { name: "50 States Tracker" });
    await expectCentersLineUp([brand, counter(page), themeButton(page), menuButton(page)]);
  });

  test("on a phone, the header's buttons and menu items are big enough for a finger", async ({ page }, info) => {
    test.skip(!isPhone(info.project.name), "touch screens");
    await expectAtLeastTall([themeButton(page), menuButton(page)], 44);
    await openNavMenu(page);
    await expectAtLeastTall(await page.getByRole("menuitem").all(), 44);
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
