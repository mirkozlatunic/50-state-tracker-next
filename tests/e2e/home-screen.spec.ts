// Slice 8: what the iPhone needs for "Add to Home Screen" (the same checks as
// the Flask app's test_home_screen.py), and the backup download.
import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";
import { expect, test, type APIResponse } from "@playwright/test";
import { addVisit } from "@/db/queries";
import { logIn, openNavMenu, openTestDatabase, resetData, today, userId } from "./helpers";

/** The width and height of a PNG image, read from its header. */
async function pngSize(response: APIResponse): Promise<[number, number]> {
  const data = await response.body();
  expect(data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "not a PNG").toBe(true);
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

test.describe("Add to Home Screen (works logged out, like Flask)", () => {
  test("the manifest names the app and opens full screen on the map", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/^application\/manifest\+json/);
    const manifest = await response.json();
    expect(manifest).toMatchObject({
      name: "50 States Tracker",
      short_name: "50 States",
      start_url: "/map",
      scope: "/",
      display: "standalone",
    });
    expect(manifest.background_color).toBeTruthy();
    expect(manifest.theme_color).toBeTruthy();
  });

  test("the manifest's icons exist at their sizes", async ({ request }) => {
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    for (const size of [192, 512]) {
      const icon = manifest.icons.find((entry: { sizes: string }) => entry.sizes === `${size}x${size}`);
      expect(icon.type).toBe("image/png");
      expect(await pngSize(await request.get(icon.src))).toEqual([size, size]);
    }
  });

  test("the iPhone icon is 180 pixels and the browser tab icon 32", async ({ request }) => {
    expect(await pngSize(await request.get("/icons/icon-180.png"))).toEqual([180, 180]);
    expect(await pngSize(await request.get("/icons/favicon-32.png"))).toEqual([32, 32]);
    const favicon = await request.get("/favicon.ico");
    expect(favicon.status()).toBe(200);
    expect(await pngSize(favicon)).toEqual([32, 32]);
  });

  test("every page links the manifest and icons, and can run full screen as “50 States”", async ({ page }) => {
    for (const url of ["/sign-in", "/states"]) {
      if (url === "/states") await logIn(page, url);
      else await page.goto(url);
      const head = page.locator("head");
      await expect(head.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
      await expect(head.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/icons/icon-180.png");
      await expect(head.locator('link[rel="icon"][href="/icons/favicon-32.png"]')).toHaveCount(1);
      await expect(head.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
      await expect(head.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", "50 States");
    }
  });
});

test.describe("Download backup", () => {
  test.beforeEach(resetData);

  test("downloads my visits and trips (nobody else's) as tracker-<today>.sqlite", async ({ page }, info) => {
    const db = await openTestDatabase();
    await addVisit(db, userId(), { state: "CO", visitDate: "2024-07-04", note: "Red Rocks", city: "Denver" });
    await addVisit(db, userId("B"), { state: "UT", visitDate: "2024-07-05", note: "someone else's", city: null });
    db.$client.close();
    await logIn(page);
    const download = page.waitForEvent("download");
    await openNavMenu(page);
    await page.getByRole("menuitem", { name: "Download backup" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe(`tracker-${today()}.sqlite`);
    const path = info.outputPath("backup.sqlite");
    await file.saveAs(path);
    expect(readFileSync(path).subarray(0, 16).toString("latin1")).toBe("SQLite format 3\u0000");
    const copy = createClient({ url: `file:${path}` });
    const notes = (await copy.execute("SELECT note FROM visits")).rows.map((row) => row.note);
    copy.close();
    expect(notes).toEqual(["Red Rocks"]);
  });

  test("signed out, the backup asks you to sign in instead", async ({ browser }) => {
    const page = await (await browser.newContext()).newPage();
    await page.goto("/backup");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
