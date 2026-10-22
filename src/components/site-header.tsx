// The header on every page after logging in. On a computer: brand, nav,
// counter and switch on one line. On a phone (below 640px): brand, counter and
// switch on top, and the nav as its own row below (the order-* classes).

import { Suspense } from "react";
import Link from "next/link";
import { MainNav, NavLinks } from "./main-nav";
import { ThemeToggle } from "./theme-toggle";
import { CounterSkeleton } from "./loading-skeletons";
import { VisitedCounter } from "./visited-counter";

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <Link href="/" className="order-1 font-semibold whitespace-nowrap">
          50 States Tracker
        </Link>
        <Suspense fallback={<NavLinks pathname="" />}>
          <MainNav />
        </Suspense>
        <div className="order-2 ml-auto flex items-center gap-2 sm:order-3">
          <Suspense fallback={<CounterSkeleton />}>
            <VisitedCounter />
          </Suspense>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
