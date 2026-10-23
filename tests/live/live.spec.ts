// Slice 9: checks against the real, online site (no account needed).
// Slice 13: signing in is Clerk's job now, so these check the sign-in page.
// Run with: pnpm test:live   (LIVE_URL picks another address, e.g. a preview)
import { expect, test } from "@playwright/test";

const LIVE = process.env.LIVE_URL ?? "https://50-state-tracker-next.vercel.app";
const HOST = new URL(LIVE).host;

test("plain http is sent on to https", async ({ request }) => {
  const response = await request.get(`http://${HOST}/states`, { maxRedirects: 0 });
  expect([301, 307, 308]).toContain(response.status());
  expect(response.headers().location).toMatch(new RegExp(`^https://${HOST.replace(/\./g, "\\.")}/states`));
});

test("browsers are told to always use https", async ({ request }) => {
  const response = await request.get(`${LIVE}/sign-in`);
  expect(response.headers()["strict-transport-security"]).toMatch(/max-age=\d+/);
});

test("signed out, every page goes to sign in and remembers where you were going", async ({ page }) => {
  for (const path of ["/states", "/states/CA", "/map?year=2027", "/trips", "/years", "/visits/new"]) {
    await page.goto(`${LIVE}${path}`);
    await expect(page, path).toHaveURL(/\/sign-in/);
    expect(decodeURIComponent(page.url()), path).toContain(path);
  }
});

test("the backup and the city lists are never open to strangers", async ({ request }) => {
  for (const path of ["/backup", "/api/cities/CO"]) {
    const response = await request.get(`${LIVE}${path}`, { maxRedirects: 0 });
    expect(response.status(), path).not.toBe(200);
  }
});

test("the sign-in page works and offers email and Google", async ({ page }) => {
  const response = await page.goto(`${LIVE}/sign-in`);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("Sign in · 50 States Tracker");
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByRole("button", { name: /Google/ })).toBeVisible();
});

test("the old /login address goes to sign in", async ({ page }) => {
  await page.goto(`${LIVE}/login`);
  await expect(page).toHaveURL(/\/sign-in/);
});

test("the manifest and icons load without logging in", async ({ request }) => {
  const manifest = await request.get(`${LIVE}/manifest.webmanifest`);
  expect(manifest.status()).toBe(200);
  expect((await manifest.json()).start_url).toBe("/map");
  for (const path of ["/icons/icon-180.png", "/icons/icon-192.png", "/icons/icon-512.png", "/favicon.ico"]) {
    const icon = await request.get(`${LIVE}${path}`);
    expect(icon.status(), path).toBe(200);
    expect(icon.headers()["content-type"], path).toBe("image/png");
  }
});
