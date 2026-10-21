// Which pages open without logging in. proxy.ts asks this before every page.

// What the browser and the home screen icon need, even logged out.
const PUBLIC_FILES = ["/manifest.webmanifest", "/favicon.ico"];
const PUBLIC_FOLDERS = ["/icons/"];

export type Access = { kind: "allow" } | { kind: "redirect"; to: string } | { kind: "setup" };

/** Decide what happens to a request for `pathname` (+ `search`, the part after "?"). */
export function decideAccess({
  pathname,
  search,
  loggedIn,
  setUp,
}: {
  pathname: string;
  search: string;
  loggedIn: boolean;
  setUp: boolean;
}): Access {
  const isPublicFile = PUBLIC_FILES.includes(pathname) || PUBLIC_FOLDERS.some((folder) => pathname.startsWith(folder));
  if (isPublicFile) return { kind: "allow" };
  // Without a password the app never runs open: it explains how to set one.
  if (!setUp) return { kind: "setup" };
  if (loggedIn || pathname === "/login") return { kind: "allow" };
  return { kind: "redirect", to: `/login?next=${encodeURIComponent(pathname + search)}` };
}

/** Where to go after logging in: only a page of this app, otherwise home.
 * "/years" is fine; "https://example.com" and "//example.com" are not. */
export function safeNext(target: string | null | undefined): string {
  if (target && target.startsWith("/") && !target.startsWith("//") && !target.includes("\\")) return target;
  return "/";
}
