// Which addresses open without signing in. proxy.ts asks this before every
// page; every other address sends you to the sign-in page.

// Pages: Clerk's sign-in and sign-up (with their steps underneath, like
// /sign-in/factor-one), and the old /login, which sends you on to /sign-in.
const PUBLIC_PAGES = ["/sign-in", "/sign-up", "/login"];
// What the browser and the home screen icon need, even signed out.
const PUBLIC_FILES = ["/manifest.webmanifest", "/favicon.ico"];
const PUBLIC_FOLDERS = ["/icons/"];

/** True when `pathname` opens without signing in. */
export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_FILES.includes(pathname)) return true;
  if (PUBLIC_FOLDERS.some((folder) => pathname.startsWith(folder))) return true;
  // The page itself or a page under it: "/sign-in/x" yes, "/sign-inx" no.
  return PUBLIC_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`));
}
