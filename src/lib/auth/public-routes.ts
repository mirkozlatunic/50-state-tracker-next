// Which addresses open without signing in. proxy.ts asks this before every
// page; every other address sends you to the sign-in page.

// Pages: Clerk's sign-in and sign-up (with their steps underneath, like
// /sign-in/factor-one), the old /login, which sends you on to /sign-in, and
// shared maps (/share/<code>, slice 20). /sharing (my settings) isn't one of them.
const PUBLIC_PAGES = ["/sign-in", "/sign-up", "/login", "/share"];
// What the browser and the home screen icon need, even signed out, and the
// badge logo (shown on the sign-in page; next/image fetches it without a login).
const PUBLIC_FILES = ["/manifest.webmanifest", "/favicon.ico", "/logo.png"];
const PUBLIC_FOLDERS = ["/icons/"];

/** True when `pathname` opens without signing in. */
export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_FILES.includes(pathname)) return true;
  if (PUBLIC_FOLDERS.some((folder) => pathname.startsWith(folder))) return true;
  // The page itself or a page under it: "/sign-in/x" yes, "/sign-inx" no.
  return PUBLIC_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`));
}
