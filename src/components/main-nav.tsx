"use client";
// The main navigation. MainNav marks the page you're on (usePathname reads the
// current address); NavLinks draws the links, and the header also uses it
// unmarked as the placeholder while the address isn't known yet.
// On phones the links are hidden here and listed in the header's menu
// (NavMenu) instead, which is drawn here too so it can mark the page as well.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { isCurrent, LINKS } from "@/lib/nav-links";
import { NavMenu } from "./nav-menu";

export function MainNav() {
  return <NavLinks pathname={usePathname()} />;
}

/** The nav's links, and the phone's menu; the one matching `pathname` is marked as the current page. */
export function NavLinks({ pathname }: { pathname: string }) {
  return (
    <>
      <nav aria-label="Main" className="max-sm:hidden">
        <ul className="flex items-center gap-1">
          {LINKS.map(({ href, label }) => {
            const current = isCurrent(pathname, href);
            return (
              <li key={href}>
                {/* A real link that looks like a shadcn button (same sizes as every button). */}
                <Link
                  href={href}
                  aria-current={current ? "page" : undefined}
                  data-slot="button"
                  className={buttonVariants({ variant: current ? "secondary" : "ghost" })}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {/* order-last: in the header it sits at the far right, after the switch. */}
      <NavMenu phone pathname={pathname} className="order-last" />
    </>
  );
}
