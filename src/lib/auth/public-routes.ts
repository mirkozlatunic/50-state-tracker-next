// Which addresses open without signing in. proxy.ts asks this before every
// page; every other address sends you to the sign-in page.

// The landing page ("/" only, slice 21) shows sample data, nobody's real data.
const LANDING_PAGE = "/";
// Pages: Clerk's sign-in and sign-up (with their steps underneath, like
// /sign-in/factor-one), the old /login, which sends you on to /sign-in, and
// shared maps (/share/<code>, slice 20). /sharing (my settings) isn't one of them.
// Slice 24: the privacy page.
const PUBLIC_PAGES = ["/sign-in", "/sign-up", "/login", "/share", "/privacy"];
// Slice 24: Clerk's account-deletion webhook. Clerk calls it without signing
// in, so it must be open; it checks Clerk's signature itself. Only this exact
// address, nothing under it.
const PUBLIC_ADDRESSES = ["/api/webhooks/clerk"];
// What the browser and the home screen icon need, even signed out, and the
// badge logo (shown on the sign-in page; next/image fetches it without a login).
const PUBLIC_FILES = ["/manifest.webmanifest", "/favicon.ico", "/logo.png"];
const PUBLIC_FOLDERS = ["/icons/"];

/** True when `pathname` opens without signing in. */
export function isPublicPath(pathname: string): boolean {
  if (pathname === LANDING_PAGE) return true;
  if (PUBLIC_ADDRESSES.includes(pathname)) return true;
  if (PUBLIC_FILES.includes(pathname)) return true;
  if (PUBLIC_FOLDERS.some((folder) => pathname.startsWith(folder))) return true;
  // The page itself or a page under it: "/sign-in/x" yes, "/sign-inx" no.
  return PUBLIC_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`));
}
