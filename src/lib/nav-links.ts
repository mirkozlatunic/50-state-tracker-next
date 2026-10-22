// The app's pages, as listed in the header (the nav on a computer, the menu on a phone).

export const LINKS = [
  { href: "/states", label: "States" },
  { href: "/map", label: "Map" },
  { href: "/visits/new", label: "Add visit" },
  { href: "/trips", label: "Trips" },
  { href: "/years", label: "Years" },
];

/** True when `pathname` is the page `href` or one of its sub-pages (/trips/3/edit is under /trips). */
export function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
