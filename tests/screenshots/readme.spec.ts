// The README's screenshots (slice 25): the landing page and the map, on a
// computer and an iPhone, in light and dark. Test person A's tracker is filled
// with the landing page's sample data (src/lib/demo-data.ts) first, in the
// tests' own database, so no real data is ever shown.
import { join } from "node:path";
import { expect, test, type Browser } from "@playwright/test";
import { addTrip, addVisit } from "@/db/queries";
import { todayIn } from "@/lib/dates";
import { demoData } from "@/lib/demo-data";
import { logIn, openTestDatabase, resetData, userId } from "../e2e/helpers";

const OUT = join(__dirname, "..", "..", "docs", "screenshots");

// The two screen sizes: a computer, and an iPhone (drawn at 2x, so it's sharp).
const SIZES = {
  desktop: { viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  iphone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
} as const;

type Size = keyof typeof SIZES;
type Scheme = "light" | "dark";

/** A fresh browser window of this size and theme. */
async function newPage(browser: Browser, size: Size, colorScheme: Scheme) {
  return (await browser.newContext({ ...SIZES[size], colorScheme })).newPage();
}

test.beforeAll(async () => {
  // Fill test person A's tracker with the sample data (trips always lie ahead).
  await resetData();
  const db = await openTestDatabase();
  const { visits, trips } = demoData(todayIn());
  for (const visit of visits) await addVisit(db, userId(), { ...visit, note: "" });
  for (const { name, startDate, endDate, states, cities } of trips) await addTrip(db, userId(), { name, startDate, endDate, states, cities });
  db.$client.close();
});

for (const size of Object.keys(SIZES) as Size[]) {
  for (const scheme of ["light", "dark"] as Scheme[]) {
    test(`landing page, ${size}, ${scheme}`, async ({ browser }) => {
      const page = await newPage(browser, size, scheme);
      await page.goto("/");
      await expect(page.getByRole("figure", { name: "Map of the 50 states" })).toBeVisible();
      await page.screenshot({ path: join(OUT, `landing-${size}-${scheme}.png`) });
    });

    test(`map page, ${size}, ${scheme}`, async ({ browser }) => {
      const page = await newPage(browser, size, scheme);
      await logIn(page, "/map");
      await expect(page.getByRole("list", { name: "Progress" })).toBeVisible();
      // Computers show the map; phones show the next trip and the region cards.
      if (size === "desktop") await expect(page.getByRole("figure", { name: "Map of the 50 states" })).toBeVisible();
      else await expect(page.getByRole("region", { name: "Next trip" })).toBeVisible();
      // Wait until Clerk has loaded, so the account button shows its icon, not the loading circle.
      if (size === "desktop") await expect(page.getByRole("button", { name: "Account" }).locator("svg")).toBeVisible();
      await page.waitForTimeout(500); // let the header's slide-in finish
      await page.screenshot({ path: join(OUT, `map-${size}-${scheme}.png`) });
    });
  }
}
