// Slice 13: which addresses open without signing in. proxy.ts sends every
// other address to the sign-in page (Clerk's auth.protect()).
import { describe, expect, test } from "vitest";
import { isPublicPath } from "@/lib/auth/public-routes";

describe("open without signing in", () => {
  test.each([
    "/", // the landing page with sample data (slice 21)
    "/sign-in",
    "/sign-in/factor-one", // Clerk's sign-in steps live under /sign-in/...
    "/sign-up",
    "/sign-up/verify-email-address",
    "/login", // the old address: it sends you on to /sign-in
    "/manifest.webmanifest",
    "/favicon.ico",
    "/icons/icon-180.png",
    "/logo.png", // the badge on the sign-in page (and next/image fetches it without signing in)
    "/share/abcdefghijklmnopqrstuv", // a shared map (slice 20)
    "/share/abcdefghijklmnopqrstuv/opengraph-image", // its preview picture
    "/privacy", // slice 24: what's stored and how to delete it
    "/api/webhooks/clerk", // slice 24: Clerk calls it without signing in; its signature check protects it
  ])("%s", (path) => {
    expect(isPublicPath(path)).toBe(true);
  });
});

describe("needs signing in", () => {
  test.each([
    "/states",
    "/states/CA",
    "/map",
    "/trips",
    "/trips/3/edit",
    "/visits/new",
    "/years",
    "/backup",
    "/api/cities/CO",
    "/sign-inx", // only /sign-in itself and the pages under it are open
    "/icons", // the folder's files are open, not other addresses that start the same way
    "/setup", // the old "set a password" page is gone
    "/photos/1", // photos are private (slice 18)
    "/api/visits/1/photos",
    "/sharing", // my own share settings
    "/api/webhooks", // only Clerk's own webhook address is open
    "/api/webhooks/other",
    "/api/webhooks/clerk/x",
  ])("%s", (path) => {
    expect(isPublicPath(path)).toBe(false);
  });
});
