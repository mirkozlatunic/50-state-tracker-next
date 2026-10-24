// Slice 3: the app shell — header, nav, counter and light/dark switch, on
// desktop and iPhone, with the buttons measured to line up.
// Slice 11: the header is a fixed pill that stays on screen while scrolling,
// and Download backup and Log out moved from the footer into its menu.
// Slice 22: the logo shows its name as a tooltip instead of text, the account
// button shows your profile picture, and light/dark fades softly.
// Slice 22b: the tooltip appears without a wait, and a quick double-click on
// the light/dark switch switches twice (back to where it started).
// Slice 22c: the double-click test proves both switches happened, and the
// switch still works after the theme was changed elsewhere (another tab).
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

test.describe("the logo's name", () => {
  const logo = (page: Page) => header(page).getByRole("link", { name: "50 States Tracker" });
  // Tooltips are visual only (screen readers get the link's own name), so they
  // have no role to look for; this is shadcn's marker on the pop-up.
  const TOOLTIP = '[data-slot="tooltip-content"]';

  test("isn't written next to the logo any more", async ({ page }) => {
    await expect(logo(page)).toBeVisible();
    expect(await header(page).innerText()).not.toContain("50 States Tracker");
  });

  test("shows as a tooltip when the mouse is over the logo", async ({ page }, info) => {
    test.skip(isPhone(info.project.name), "no mouse on a phone");
    await logo(page).hover();
    await expect(page.locator(TOOLTIP)).toHaveText("50 States Tracker");
  });

  test("appears right away, not after Base UI's usual 0.6 s wait", async ({ page }, info) => {
    test.skip(isPhone(info.project.name), "no mouse on a phone");
    await logo(page).hover();
    await expect(page.locator(TOOLTIP)).toBeVisible({ timeout: 400 });
  });

  test("shows as a tooltip when the logo is reached with the keyboard", async ({ page }, info) => {
    test.skip(isPhone(info.project.name), "no keyboard on a phone");
    // Tab from the top of the page until the logo has the focus.
    await expect(async () => {
      await page.keyboard.press("Tab");
      await expect(logo(page)).toBeFocused({ timeout: 200 });
    }).toPass({ timeout: 10_000 });
    await expect(page.locator(TOOLTIP)).toHaveText("50 States Tracker");
  });
});

test.describe("the account button", () => {
  test("without a profile picture (like the test people), it shows the person icon", async ({ page }, info) => {
    test.skip(isPhone(info.project.name), "the phone shows the Menu icon instead");
    const button = header(page).getByRole("button", { name: "Account" });
    await expect(button.locator("svg")).toBeVisible();
    await expect(button.locator("img")).toHaveCount(0);
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

  test("switching fades softly from one theme to the other (about 0.3 s)", async ({ page }) => {
    // Count the browser's page fades ("view transitions") and note how long they take.
    await page.addInitScript(() => {
      const start = document.startViewTransition?.bind(document);
      if (!start) return;
      const record = window as unknown as { fades: number; fadeDurations: number[] };
      record.fades = 0;
      document.startViewTransition = ((update: ViewTransitionUpdateCallback) => {
        record.fades += 1;
        const transition = start(update);
        transition.ready.then(() => {
          record.fadeDurations = document
            .getAnimations()
            .filter((animation) => (animation.effect as KeyframeEffect | null)?.pseudoElement?.startsWith("::view-transition"))
            .map((animation) => Number(animation.effect!.getTiming().duration));
        });
        return transition;
      }) as typeof document.startViewTransition;
    });
    await page.goto("/map");
    const html = page.locator("html");
    const startedDark = ((await html.getAttribute("class")) ?? "").includes("dark");
    await themeButton(page).click();
    await expect(html).toHaveClass(startedDark ? /^(?!.*\bdark\b)/ : /\bdark\b/);
    expect(await page.evaluate(() => (window as unknown as { fades: number }).fades)).toBe(1);
    const durations = await page.waitForFunction(() => (window as unknown as { fadeDurations?: number[] }).fadeDurations);
    const values = (await durations.jsonValue()) as number[];
    expect(values.length).toBeGreaterThan(0);
    for (const duration of values) expect(duration).toBe(300);
  });

  test("a quick double-click switches twice, ending on the theme it started with", async ({ page }) => {
    // Count the fades (one per click that reached the switch) and how many have finished.
    await page.addInitScript(() => {
      const record = window as unknown as { fades: number; finished: number };
      Object.assign(record, { fades: 0, finished: 0 });
      const start = document.startViewTransition?.bind(document);
      if (start) {
        document.startViewTransition = ((update: ViewTransitionUpdateCallback) => {
          record.fades += 1;
          const transition = start(update);
          transition.finished.finally(() => (record.finished += 1)).catch(() => {});
          return transition;
        }) as typeof document.startViewTransition;
      }
    });
    await page.goto("/map");
    const html = page.locator("html");
    const started = ((await html.getAttribute("class")) ?? "").includes("dark") ? "dark" : "light";
    const record = () =>
      page.evaluate(() => {
        const { fades, finished } = window as unknown as { fades: number; finished: number };
        return { fades, finished };
      });
    await themeButton(page).dblclick(); // two clicks, well inside the 0.3 s fade
    // Both clicks reached the switch (each started a fade), and both fades are
    // over. (The second click comes before the first fade applies its change,
    // so both apply the final pick: no flash of the other theme in between.)
    await expect.poll(async () => (await record()).finished).toBe(2);
    expect((await record()).fades).toBe(2);
    await expect(html).toHaveClass(started === "dark" ? /\bdark\b/ : /^(?!.*\bdark\b)/);
    await page.reload(); // and that's the choice that's remembered
    await expect(html).toHaveClass(started === "dark" ? /\bdark\b/ : /^(?!.*\bdark\b)/);
  });

  test("after a double-click, a theme change in another tab doesn't confuse the switch", async ({ page }) => {
    await page.goto("/map");
    const html = page.locator("html");
    const isDark = async () => ((await html.getAttribute("class")) ?? "").includes("dark");
    const started = await isDark();
    await themeButton(page).dblclick(); // back where it started
    await expect.poll(isDark).toBe(started);
    await page.waitForTimeout(500); // the fades are over
    // Another tab of the app switches the theme; next-themes tells this tab.
    const otherTab = await page.context().newPage();
    await otherTab.goto("/map");
    await themeButton(otherTab).click();
    await expect.poll(isDark).toBe(!started);
    // One click here switches back (it doesn't use the double-click's old pick).
    await themeButton(page).click();
    await expect.poll(isDark).toBe(started);
  });

  test("with reduced motion turned on, it switches at once (no fade)", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => {
      const record = window as unknown as { fades: number };
      record.fades = 0;
      const start = document.startViewTransition?.bind(document);
      if (start) {
        document.startViewTransition = ((update: ViewTransitionUpdateCallback) => {
          record.fades += 1;
          return start(update);
        }) as typeof document.startViewTransition;
      }
    });
    await page.goto("/map");
    const html = page.locator("html");
    const startedDark = ((await html.getAttribute("class")) ?? "").includes("dark");
    await themeButton(page).click();
    await expect(html).toHaveClass(startedDark ? /^(?!.*\bdark\b)/ : /\bdark\b/);
    expect(await page.evaluate(() => (window as unknown as { fades: number }).fades)).toBe(0);
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
