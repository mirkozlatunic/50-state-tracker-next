// The header on every page after logging in: a pill that floats at the top and
// stays there while you scroll (AnimatedNav). On a computer: brand, page links,
// counter, light/dark switch and the Account menu. On a phone (below 640px) the
// page links move into the menu, which is then called "Menu" (drawn by NavLinks,
// so it knows the current page).

import { Suspense } from "react";
import Link from "next/link";
import { AnimatedNav } from "@/components/ui/animated-nav";
import { buttonVariants } from "@/components/ui/button";
import { BrandLogo } from "./brand-logo";
import { MainNav, NavLinks } from "./main-nav";
import { NavMenu } from "./nav-menu";
import { ThemeToggle } from "./theme-toggle";
import { CounterSkeleton } from "./loading-skeletons";
import { VisitedCounter } from "./visited-counter";

export function SiteHeader() {
  return (
    <AnimatedNav>
      {/* The badge logo, cut to a circle; the name also shows on wide screens. */}
      <Link
        href="/map"
        aria-label="50 States Tracker"
        data-slot="button"
        className={buttonVariants({ variant: "ghost", className: "pointer-coarse:min-w-11" })}
      >
        <BrandLogo pixels={28} />
        <span className="hidden tracking-wide lg:inline">50 States Tracker</span>
      </Link>
      <Suspense fallback={<NavLinks pathname="" />}>
        <MainNav />
      </Suspense>
      <span className="flex items-center px-1">
        <Suspense fallback={<CounterSkeleton />}>
          <VisitedCounter />
        </Suspense>
      </span>
      <ThemeToggle />
      <NavMenu />
    </AnimatedNav>
  );
}
